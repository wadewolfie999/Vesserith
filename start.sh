#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ ! -d node_modules || ! -f .env.local ]]; then
  echo 'Run npm ci and copy .env.example to .env.local first. See README.md.' >&2
  exit 1
fi
exec npm run dev
