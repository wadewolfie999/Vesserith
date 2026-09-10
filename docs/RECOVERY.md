# Backup and recovery

Run commands from the repository root with its `.venv`. Backups contain private
records. Default local backups protect against editing mistakes, not disk loss.
An independently stored copy is needed for disk loss; no cross-machine backup
or storage mount changes are implemented.

## Back up

```sh
.venv/bin/python -m backend.cli backup .local/backups/my-checkpoint.sqlite3
```

Choose a new filename each time. SQLite's online backup API takes a consistent
snapshot even while the app runs. A `.sqlite3.json` sidecar records app version,
Git revision, schema, creation time, and SHA-256. Keep both files together.
The command refuses an existing destination. Before upgrading an existing schema,
startup automatically creates a pre-migration backup; backup failure stops migration.
Migrations are transactional, applied in numerical order, and never run backwards.

## Restore

1. Stop the app with Ctrl+C and close its browser tabs. Copy any unsaved input.
2. Choose a backup compatible with the app schema. The CLI checks checksum,
   SQLite integrity, schema, and the orientation contract before replacement.
3. Restore with an explicit new backup of the current data:

```sh
.venv/bin/python -m backend.cli restore .local/backups/my-checkpoint.sqlite3 --before .local/backups/before-restore.sqlite3 --confirm-replace
```

4. Start the app and reload. Confirm the expected orientation and history.

**Entries saved after the selected backup will disappear from the active view.**
They remain in the `--before` backup. There is no automatic merge. The CLI
refuses restore while the server's database lock is held. Replacement is atomic.
Use the supported CLI to run the server so that this lock remains effective.

## Revert app code

Stop the server; preserve pending source work. Switch to the desired release tag
or branch using Git, reinstall its locked dependencies, and rebuild the frontend.
When the schema is unchanged, code-only rollback is sufficient. For an older schema,
use that release's restore command with its matching database backup. Starting an
older app on a newer database is rejected. Never reset or overwrite a dirty checkout
as part of recovery. Release 0.1.0 uses schema 1; the former static dashboard cannot
read orientation data.

## Disposable verification

`npm test` exercises backup/restore, preservation of pre-restore data, rejection of
a corrupt backup, future-schema refusal, and automatic pre-migration backup.
Use `--database /tmp/example.sqlite3` before the CLI subcommand to test without
using your real orientation. Never run recovery tests against personal records.
