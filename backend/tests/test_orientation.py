import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from backend import storage
from backend.app import create_app
from backend.cli import restore
from backend.model import empty


def item(id="idea"):
    return dict(
        id=id,
        title="An uncertain idea",
        area="Income",
        state="Considering",
        origin="Self-proposed",
        scope="Recommend",
        next_action="Review evidence",
        stopping_point="A written decision",
        waiting_for="",
        review_date="",
        uncertainty="Whether to continue",
        references="",
    )


class OrientationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "state.sqlite3"
        self.client = create_app(self.path).test_client()

    def save(self, d, revision=1, reason="Test decision"):
        return self.client.put(
            "/api/orientation", json=dict(document=d, revision=revision, reason=reason)
        )

    def test_uncertainty_persists_across_app_restart(self):
        d = empty()
        d["items"] = [item()]
        self.assertEqual(self.save(d).status_code, 200)
        restarted = create_app(self.path).test_client().get("/api/orientation").json
        self.assertEqual(restarted["document"], d)
        self.assertEqual(restarted["document"]["items"][0]["state"], "Considering")

    def test_parking_preserves_focus_and_chosen_action(self):
        d = empty()
        d["focus"] = "Existing focus"
        chosen = item()
        chosen["state"] = "Chosen"
        parked = item("parked")
        parked["state"] = "Set aside"
        d["items"] = [chosen, parked]
        result = self.save(d).json["document"]
        self.assertEqual(result["focus"], "Existing focus")
        self.assertEqual(result["items"][0], chosen)

    def test_two_chosen_actions_rejected_without_history(self):
        d = empty()
        d["items"] = [item(), item("second")]
        for i in d["items"]:
            i["state"] = "Chosen"
        self.assertEqual(self.save(d).status_code, 400)
        self.assertEqual(len(storage.history(self.path)), 1)

    def test_chosen_action_requires_stop(self):
        d = empty()
        i = item()
        i["state"] = "Chosen"
        i["stopping_point"] = ""
        d["items"] = [i]
        self.assertEqual(self.save(d).status_code, 400)

    def test_conflict_preserves_newer_save(self):
        d = empty()
        d["focus"] = "First tab"
        self.save(d)
        d["focus"] = "Stale tab"
        self.assertEqual(self.save(d).status_code, 409)
        self.assertEqual(storage.read(self.path)["document"]["focus"], "First tab")

    def test_history_is_atomic_when_write_fails(self):
        with storage.connect(self.path) as db:
            db.execute(
                "CREATE TRIGGER fail_history BEFORE INSERT ON activity BEGIN SELECT RAISE(ABORT,'test failure'); END"
            )
        d = empty()
        d["focus"] = "Should roll back"
        with self.assertRaises(Exception):
            storage.save(self.path, d, 1, "")
        self.assertEqual(storage.read(self.path)["revision"], 1)
        self.assertEqual(storage.read(self.path)["document"]["focus"], "")

    def test_note_only_save_is_recorded(self):
        self.assertEqual(
            self.save(empty(), reason="Stopped at the open question").status_code, 200
        )
        self.assertEqual(
            storage.history(self.path)[0]["reason"], "Stopped at the open question"
        )

    def test_backup_restore_and_prior_state_preserved(self):
        d = empty()
        d["focus"] = "Before"
        self.save(d)
        backup = Path(self.temp.name) / "backup.sqlite3"
        storage.backup(self.path, backup)
        d["focus"] = "After"
        self.save(d, 2)
        before = Path(self.temp.name) / "pre-restore.sqlite3"
        restore(self.path, backup, before)
        self.assertEqual(storage.read(self.path)["document"]["focus"], "Before")
        self.assertEqual(storage.read(before)["document"]["focus"], "After")
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        with self.assertRaises(FileExistsError):
            storage.backup(self.path, backup)

    def test_corrupt_backup_refused(self):
        backup = Path(self.temp.name) / "backup.sqlite3"
        storage.backup(self.path, backup)
        with backup.open("ab") as f:
            f.write(b"corrupt")
        with self.assertRaises(ValueError):
            restore(self.path, backup, Path(self.temp.name) / "before.sqlite3")
        self.assertEqual(storage.read(self.path)["revision"], 1)

    def test_future_database_rejected(self):
        with storage.connect(self.path) as db:
            db.execute("PRAGMA user_version=999")
        with self.assertRaises(ValueError):
            storage.initialize(self.path)

    def test_migration_idempotent(self):
        storage.initialize(self.path)
        storage.initialize(self.path)
        self.assertEqual(len(storage.history(self.path)), 1)

    def test_pending_migration_backs_up_existing_data(self):
        folder = Path(self.temp.name) / "migrations"
        folder.mkdir()
        (folder / "001_initial.sql").write_text("")
        (folder / "002_test.sql").write_text("CREATE TABLE probe (id INTEGER);")
        with patch.object(storage, "MIGRATIONS", folder):
            storage.initialize(self.path)
        backups = list((self.path.parent / "backups").glob("*.sqlite3"))
        self.assertEqual(len(backups), 1)
        with storage.connect(backups[0]) as db:
            self.assertEqual(storage.schema(db), 1)
        with storage.connect(self.path) as db:
            self.assertEqual(storage.schema(db), 2)

    def test_export_retains_uncertainty_and_authority(self):
        d = empty()
        d["items"] = [item()]
        self.save(d)
        text = self.client.get("/api/export").text
        for expected in [
            "Considering",
            "Self-proposed",
            "Whether to continue",
            "not permission",
            "schema 1",
        ]:
            self.assertIn(expected, text)

    def test_local_security_boundaries(self):
        self.assertEqual(
            self.client.get(
                "/api/orientation", base_url="http://evil.test"
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                "/api/orientation", environ_overrides={"REMOTE_ADDR": "192.168.1.2"}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                "/api/export", headers={"Sec-Fetch-Site": "cross-site"}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.put(
                "/api/orientation", json={}, headers={"Origin": "https://evil.test"}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.put(
                "/api/orientation", data="{}", content_type="text/plain"
            ).status_code,
            415,
        )
        self.assertEqual(
            self.client.get("/api/orientation").headers["Cache-Control"], "no-store"
        )

    def test_bad_input_preserves_saved_state(self):
        for d in [None, {}, dict(empty(), focus=3)]:
            self.assertEqual(self.save(d).status_code, 400)
        self.assertEqual(storage.read(self.path)["revision"], 1)

    def test_private_files_not_served(self):
        for url in [
            "/backend/app.py",
            "/.local/orientation.sqlite3",
            "/registry/projects.json",
        ]:
            self.assertEqual(self.client.get(url).status_code, 404)


if __name__ == "__main__":
    unittest.main()
