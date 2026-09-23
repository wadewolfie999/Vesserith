# Vesserith

A private learning observatory: a personal, editable trail with stages, gates,
routes, mastery signals, and notes that follow your GitHub account.

**Vesserith v3.0.0 is released** at the existing
[GitHub Pages site](https://wadewolfie999.github.io/Vesserith/). See
[the release ledger](docs/V3_RELEASE.md) for deployment and verification evidence.

## Architecture

React/TypeScript/Vite serves public assets at the existing
[GitHub Pages address](https://wadewolfie999.github.io/Vesserith/).
Supabase supplies GitHub identity-only PKCE sign-in and private PostgreSQL state.
Sign-in does not grant repository access. Each account starts with a neutral
six-stage MCP trail, Gate A, and Routes A–D; no owner's progress or notes are seeded.

## Run locally

Use Node.js 24 LTS or later and npm. No Python service is needed for v3.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:4180/Vesserith/`; stop with Ctrl+C. `./start.sh`
runs the same server. An occupied port fails without terminating another process.
This preview uses **real account data** in the dedicated Supabase project.

Only the project URL and publishable key belong in frontend variables. Never add
database passwords, service-role keys, or OAuth secrets to `VITE_*` variables.
Supabase holds the OAuth secret. Production and local redirect URLs are exact;
wildcard redirects are not needed.

## State and recovery

Supabase is authoritative. Account reads use RLS; writes go through owner-checking,
transactional RPCs. Direct table writes and anonymous reads are denied. Per-field
revisions merge independent edits; conflicts require review. Request IDs make
retries idempotent. Notes retain account-scoped recovery drafts on input and save
after 300 ms idle, or two seconds of continuous typing. Refocus/reconnect and
visible two-second polling fetch changes without replacing an active editor.

Sign-out flushes writes or offers a private recovery export. Expired sessions keep
drafts scoped to the original user. Use **Account → Export my context** before
major edits; exports include pending recovery work and must be kept private.

**Import context** previews changes and retains conflicting account values by
default, including empty notes. It accepts `mcp-nightpath.context.v1` and
`vesserith.context.v1`. Pages cannot read the older Sites origin's storage:
export from that origin or the old localhost app, then review the file here.
The old Site, browser entries, and Mac SQLite database remain intact.

## Verification

```sh
npm run check
npm test
npm run build
npm run verify:artifact
```

Database tests run migrations in embedded PostgreSQL (PGlite) with stubbed auth
identities. Store/WebMCP unit tests use isolated service stubs. These are distinct
from real OAuth, two-account isolation, and cross-browser acceptance evidence.

For destructive UI testing, run `node tests/fixture-server.mjs` alongside Vite and
open `http://127.0.0.1:4180/Vesserith/tests/workspace.html`. This developer-only
fixture has an ephemeral database and simulated identity, never real learner data.
Restarting it discards fixture state. It is excluded from the production build.

## Publishing and rollback

[The Pages workflow](.github/workflows/pages.yml) installs the lockfile, checks,
tests, builds, and verifies an allow-listed `dist`. Pull requests cannot deploy.
Main commits or explicit main dispatches deploy via the existing `github-pages`
environment with minimal Pages/OIDC permissions and serialized deployment.

Apply reviewed immutable [migrations](supabase/migrations) before dependent
frontend releases. Never rerun applied files; their hashes are in the release
ledger. No Sites project or local database is part of v3 publishing.

Pre-v3 source is preserved at `7f6291b89391780a5ec9a3d4650c945bd13e0bfb`.
Retained `backend/`, `requirements.txt`, and older recovery/iteration documents
describe the superseded local orientation app. Do not run that backend against
the v3 build. See [ADR 0008](docs/adr/0008-v3-private-trails.md) for account and
recovery boundaries. Frontend rollback never deletes account data or reverses SQL.
