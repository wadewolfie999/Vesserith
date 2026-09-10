# Development and release protocol

The first orientation release is 0.1.0. `package.json` owns the app version;
package-lock.json follows npm. The API reads that version and the exact Git
revision. A clean checkout at the matching `vX.Y.Z` tag is a release; otherwise
it is explicitly development. Schema version is independent (`PRAGMA user_version`).

For each iteration:

1. Write `docs/iterations/X.Y.Z.md`: problem, authorized scope, exclusions,
   acceptance checks, and recovery implications. Mark unapproved additions as
   proposals, never accepted scope. Obtain authorization for new work.
2. Inspect status and baseline, then create `codex/X.Y.Z-description` before edits.
3. Implement one bounded change. Add a new numbered migration if needed; never
   modify SQL from an already released migration. Prefer additive changes.
4. Run relevant tests/build and record actual results and outstanding limits.
5. Update `CHANGELOG.md`. Increment the middle version for capabilities or
   changed workflows, the last for fixes that preserve workflows. A breaking
   change in 0.x requires a middle-number increment and migration/recovery notes.
6. Commit verified code, then tag the exact commit `vX.Y.Z`. Tags are immutable;
   a fix gets a new version. Keep the working release identifiable even while
   the next branch is under development. Merge/push only within user authorization.
7. Use the app and record feedback before enlarging scope. A release tag records
   a verified checkpoint; the one-minute usefulness criterion still needs user use.

Personal record edits are activity revisions, not app releases. Never commit
personal data, exported context, or backups. Release changes and user decisions
are different histories. `GET /api/meta` and context exports identify the app,
commit, release/development status, and schema.

This repository's older dashboard used 0.1.0 in its package file without a Git
release tag. The orientation release begins the explicit tagged protocol.
