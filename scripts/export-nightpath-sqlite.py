#!/usr/bin/env python3
"""Read a consistent legacy snapshot without changing the original database.

The output contains private learner data. Keep it outside this repository and
review it through Vesserith's account import before applying anything.
"""
import argparse
import datetime
import json
import os
from pathlib import Path
import sqlite3


def export(database: Path, destination: Path) -> dict:
    if destination.resolve().is_relative_to(Path(__file__).resolve().parents[1]):
        raise ValueError("Private exports must be outside the repository")
    stages = ("ground", "model", "server", "client", "failures", "independence")
    signals = ("understand", "execute", "explain")
    with sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True) as connection:
        connection.execute("BEGIN")
        revision, initialized = connection.execute("SELECT revision, initialized FROM meta WHERE id=1").fetchone()
        if not initialized:
            raise ValueError("Legacy store has not been initialized")
        fields = dict(connection.execute("SELECT key, value FROM fields"))
    notes = {stage: fields[f"note.{stage}"] for stage in stages}
    mastery = {stage: {signal: fields[f"mastery.{stage}.{signal}"] for signal in signals} for stage in stages}
    if any(value not in ("not_yet", "practicing", "independent") for ratings in mastery.values() for value in ratings.values()):
        raise ValueError("Legacy store contains an invalid mastery value")
    payload = {
        "format": "mcp-nightpath.context.v1", "version": 1,
        "exportedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": {"kind": "saved-local-sqlite", "revision": revision,
                   "pendingBrowserDraftsIncluded": False},
        "state": {"mastery": mastery, "notes": notes},
    }
    # Exclusive creation prevents overwriting an earlier private recovery copy.
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as target:
        json.dump(payload, target, ensure_ascii=False, indent=2)
        target.write("\n")
        target.flush()
        os.fsync(target.fileno())
    return {"revision": revision, "notes": len(notes),
            "noteBytes": {stage: len(value.encode("utf-8")) for stage, value in notes.items()},
            "ratings": {stage: ratings for stage, ratings in mastery.items()}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(json.dumps(export(args.database, args.destination), indent=2))
