#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ ! -x .venv/bin/python || ! -f dist/index.html ]]; then
  echo 'Setup is incomplete. Follow the Run locally instructions in README.md.' >&2
  exit 1
fi
exec .venv/bin/python -m backend.cli serve
