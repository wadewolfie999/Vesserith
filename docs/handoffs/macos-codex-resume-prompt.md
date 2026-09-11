# Mac Codex resume prompt

You are resuming Vesserith development on this Mac. Read
`docs/handoffs/macos-codex-resume.v1.json` and the operational documents it
lists before taking action.

The intended code baseline is `main` at
`e1fb31c9140b183229029e3e8056821692bf2bdd`, containing Vesserith 0.2.1 and
the merged ultra-minimal-copy change. First inspect `git status`, fetch the
remote, and stop if `origin/main` is not that exact commit; report the newer
state instead of silently combining it with this handoff.

Vesserith is a localhost-only personal orientation app: React/Vite frontend,
Flask JSON API, SQLite, and explicit numbered SQL migrations. It listens only
on `127.0.0.1:8765`. Do not add authentication, hosting, Docker, Nginx,
WebSockets, synchronization, or external execution.

## One-time orientation restore

The user has manually placed a private handoff bundle on this Mac. It contains
`orientation.sqlite3`, its `.sqlite3.json` checksum sidecar, and a private
manifest. This is the authorized one-time baseline restore only.

1. Stop the Mac Vesserith server and close its tabs. Do not copy the bundle to
   Git, a cloud drive, an issue, a pull request, or chat.
2. Confirm the bundle is local, owner-only, and complete. Do not print or
   export its orientation content.
3. From the repository root, restore through the supported CLI, replacing
   `BUNDLE_DIR` with the local private bundle path:

   ```sh
   .venv/bin/python -m backend.cli restore \
     "BUNDLE_DIR/orientation.sqlite3" \
     --before ".local/backups/mac-before-restore.sqlite3" \
     --confirm-replace
   ```

   The command verifies the checksum, SQLite integrity, schema, and orientation
   contract, then preserves the pre-restore Mac database in `--before`.
4. Build and start locally. Confirm the restored orientation, History, and maps
   are present; do not save an edit during this check.

The transferred orientation is user context, not authorization for new work.
Preserve uncertainty, distinguish Requested/Inferred/Self-proposed work, and
require a concrete next action and stopping point for any Chosen entry.

## Continuing development

After the restore verification, create a fresh `codex/` branch from the
verified base before code changes. Keep `.local` private. Make the smallest
coherent product change requested by the user; add an iteration record and a
new migration only when the change actually requires one. Validate with tests,
lint, production build, dependency check, whitespace check, and local browser
verification. Commit and open a pull request only when explicitly authorized.
