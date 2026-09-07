"""Package version is authoritative; release status requires an exact clean tag."""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def version_info():
    version = json.loads((ROOT / "package.json").read_text())["version"]

    def git(*args):
        return subprocess.check_output(
            ["git", *args], cwd=ROOT, stderr=subprocess.DEVNULL, text=True, timeout=3
        ).strip()

    try:
        revision = git("rev-parse", "--short", "HEAD")
        dirty = bool(git("status", "--porcelain"))
        try:
            tag = git("describe", "--tags", "--exact-match", "HEAD")
        except subprocess.SubprocessError:
            tag = ""
        status = "release" if tag == f"v{version}" and not dirty else "development"
    except (OSError, subprocess.SubprocessError):
        revision, status = "unknown", "development"
    return dict(version=version, commit=revision, status=status)
