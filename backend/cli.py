"""Local lifecycle commands. Restore requires a stopped server and a new pre-restore backup."""

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import tempfile
from . import storage
from .model import validate


def restore(path, source, before):
    source = Path(source)
    path = Path(path)
    if source.resolve() == path.resolve():
        raise ValueError("Choose a separate backup file.")
    manifest = json.loads(source.with_suffix(source.suffix + ".json").read_text())
    if hashlib.sha256(source.read_bytes()).hexdigest() != manifest["sha256"]:
        raise ValueError("Backup checksum does not match.")
    with storage.connect(source) as db:
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("Damaged backup.")
        expected = len(list(storage.MIGRATIONS.glob("*.sql")))
        if storage.schema(db) != expected:
            raise ValueError("Use an app matching this backup schema.")
        validate(
            json.loads(
                db.execute("SELECT document FROM orientation WHERE id=1").fetchone()[0]
            )
        )
    storage.backup(path, before)
    fd, temp = tempfile.mkstemp(dir=path.parent, suffix=".sqlite3")
    os.close(fd)
    try:
        with storage.connect(source) as src, storage.connect(temp) as target:
            src.backup(target)
        os.replace(temp, path)
    finally:
        Path(temp).unlink(missing_ok=True)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=storage.default_path())
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("serve")
    commands.add_parser("init")
    seed = commands.add_parser("seed")
    seed.add_argument("file", type=Path)
    back = commands.add_parser("backup")
    back.add_argument("destination", type=Path)
    recover = commands.add_parser("restore")
    recover.add_argument("source", type=Path)
    recover.add_argument(
        "--before",
        type=Path,
        required=True,
        help="New backup of current data before replacement",
    )
    recover.add_argument("--confirm-replace", action="store_true", required=True)
    args = parser.parse_args()
    path = args.database
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        # One server per database; lifecycle changes cannot race a running server.
        with (path.parent / (path.name + ".lock")).open("a") as lock:
            if args.command != "backup":
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    raise ValueError("Stop the running server before this operation.")
            if args.command not in ("backup", "restore"):
                storage.initialize(path)
            elif not path.is_file():
                raise ValueError("Database does not exist.")
            if args.command == "serve":
                from waitress import serve
                from .app import create_app

                print("Vesserith: http://127.0.0.1:8765", flush=True)
                serve(create_app(path), host="127.0.0.1", port=8765)
            elif args.command == "seed":
                state = storage.read(path)
                if state["revision"] != 1:
                    raise ValueError(
                        "Seed refused: orientation already contains saved work."
                    )
                storage.save(
                    path,
                    json.loads(args.file.read_text()),
                    1,
                    "Initial user-provided orientation",
                )
                print("Initial orientation saved.")
            elif args.command == "backup":
                print(storage.backup(path, args.destination))
            elif args.command == "restore":
                restore(path, args.source, args.before)
                print("Restored. Previous data retained in the --before backup.")
            else:
                print("Database initialized.")
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
