"""SQLite owns the current snapshot and its atomic, append-only change history."""

from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import sqlite3
from datetime import datetime, timezone
from .model import empty, validate

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = Path(__file__).parent / "migrations"


def now():
    return datetime.now(timezone.utc).isoformat()


def default_path():
    return ROOT / ".local" / "orientation.sqlite3"


@contextmanager
def connect(path):
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def schema(db):
    return db.execute("PRAGMA user_version").fetchone()[0]


def backup(path, destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Never overwrite a recovery checkpoint.
    fd = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        with connect(path) as source, connect(destination) as target:
            source.backup(target)
            if target.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("Backup integrity check failed.")
            version = schema(target)
        from .version import version_info

        manifest = dict(
            version_info(),
            schema=version,
            created_at=now(),
            sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),
        )
        sidecar = destination.with_suffix(destination.suffix + ".json")
        fd = os.open(sidecar, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w") as output:
            output.write(json.dumps(manifest, indent=2))
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return destination


def initialize(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if not path.exists():
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
    files = sorted(MIGRATIONS.glob("[0-9][0-9][0-9]_*.sql"))
    if [int(f.name[:3]) for f in files] != list(range(1, len(files) + 1)):
        raise ValueError(
            "Migration files must be consecutively numbered starting at 001."
        )
    with connect(path) as db:
        current = schema(db)
        if current > len(files):
            raise ValueError(
                "Database is newer than this app. Use a compatible app or restore a matching backup."
            )
        if current and current < len(files):
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
            backup(path, path.parent / "backups" / f"pre-migration-{stamp}.sqlite3")
        for number, file in enumerate(files, 1):
            if number > current:
                db.executescript(
                    "BEGIN IMMEDIATE;\n"
                    + file.read_text()
                    + f"\nPRAGMA user_version={number};\nCOMMIT;"
                )
        if not db.execute("SELECT 1 FROM orientation").fetchone():
            document = json.dumps(empty())
            stamp = now()
            db.execute("INSERT INTO orientation VALUES (1,1,?,?)", (document, stamp))
            db.execute(
                "INSERT INTO activity(revision,recorded_at,reason,document) VALUES (1,?,?,?)",
                (stamp, "Initial empty orientation", document),
            )


class Conflict(Exception):
    pass


def read(path):
    with connect(path) as db:
        row = db.execute("SELECT * FROM orientation WHERE id=1").fetchone()
        return dict(
            revision=row["revision"],
            updated_at=row["updated_at"],
            document=json.loads(row["document"]),
        )


def save(path, document, revision, reason):
    validate(document)
    if type(revision) is not int or revision < 1:
        raise ValueError("Invalid revision.")
    if not isinstance(reason, str) or len(reason) > 12000:
        raise ValueError("Invalid reason.")
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT revision,document FROM orientation WHERE id=1"
        ).fetchone()
        if row["revision"] != revision:
            raise Conflict(
                "Another tab saved a change. Your draft is retained; reload only after copying anything you need."
            )
        if json.loads(row["document"]) != document or reason.strip():
            encoded = json.dumps(document)
            stamp = now()
            db.execute(
                "UPDATE orientation SET revision=?,document=?,updated_at=? WHERE id=1",
                (revision + 1, encoded, stamp),
            )
            db.execute(
                "INSERT INTO activity(revision,recorded_at,reason,document) VALUES (?,?,?,?)",
                (revision + 1, stamp, reason, encoded),
            )
        result = db.execute("SELECT * FROM orientation WHERE id=1").fetchone()
        saved = dict(
            revision=result["revision"],
            updated_at=result["updated_at"],
            document=json.loads(result["document"]),
        )
    return saved


def history(path):
    with connect(path) as db:
        return [
            dict(
                revision=r["revision"],
                recorded_at=r["recorded_at"],
                reason=r["reason"],
                document=json.loads(r["document"]),
            )
            for r in db.execute("SELECT * FROM activity ORDER BY revision DESC")
        ]
