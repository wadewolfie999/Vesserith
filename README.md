# Vesserith

A local personal orientation app. Open it to recover your objective, current
focus, constraints, possible next action, and deliberately postponed work.
Uncertainty and waiting are valid states. Recording an action never executes it.

## Run locally

Requirements: Python 3.12 with venv support, Node.js >=22.13, and npm.
Install project dependencies without changing system packages:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci
npm run build
npm start
```

After the initial build, `./start.sh` starts the app without Node/npm.
Open http://127.0.0.1:8765. Stop with Ctrl+C. The normal server is Waitress,
not Flask's development server; it binds only to IPv4 loopback. No cloud account,
authentication, telemetry, scheduled service, or automatic publication is used.
The retired public dashboard remains in Git history at `3231d3c`.

For frontend development, keep `npm start` running and run `npm run dev` in a
second terminal. Open http://127.0.0.1:5173; Vite proxies `/api` to Flask.
The development frontend and normal frontend share the same local database.
Back up valuable data before experiments; use `--database` with a separate
file if an experiment should use disposable data.

## Data and contract

Default data: `.local/orientation.sqlite3`, ignored by Git. Fresh checkouts start
empty. Personal starting content is never bundled into JavaScript or source.
The CLI creates owner-only files. Do not expose either port on a network.
Localhost access has no authentication: other software running as your user can
access the records. Host/origin checks reject cross-site browser requests.

SQLite owns one orientation snapshot plus an append-only history of saved
revisions. `backend/model.py` owns field validation and vocabulary; the frontend
loads allowed choices from `/api/meta`. `backend/migrations/` owns the schema.
A save transaction updates current state and history together. Revision checks
reject stale-tab writes with HTTP 409; the browser retains its unsaved draft.
There is no automatic merge. Copy your draft before reloading a conflicting tab.
Unsaved input remains in memory, not durable storage; the browser warns before
leaving. Save before closing or restarting. Context export includes saved state,
explicit uncertainty and action origin/scope, plus the latest 20 change notes.
History retains complete prior snapshots. No external files are opened by path.

Only one entry may be Chosen, with both a next action and stopping point.
Review dates are manual cues, not notifications or automatic transitions.
A reason-only save records a decision or stopping note without changing focus.

## Checks

```sh
npm test
npm run build
npm run lint
.venv/bin/pip check
```

See [the iteration record](docs/iterations/0.1.0.md),
[versioning protocol](docs/VERSIONING.md), and [recovery](docs/RECOVERY.md).
