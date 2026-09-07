# Changes

## 0.1.0 — 2026-09-07

Vesserith now opens on a local orientation screen rather than a public evidence
dashboard. It preserves objectives, constraints, focus, uncommitted possibilities,
waiting conditions, parked work, references, decisions, and stopping notes.

- React/Vite frontend and localhost-only Flask/Waitress API.
- SQLite schema 1, versioned SQL migration, atomic saved revision history,
  stale-tab protection, and explicit action origin/scope.
- Saved-context Markdown export, version display, and readable change history.
- Backup manifests and guarded restore retaining pre-restore data.
- Retired automatic GitHub Pages publication and old product routes.

Recovery: back up private data before experiments. Schema 1 is the initial
orientation schema. The old dashboard is historical source, not a compatible
orientation app. See docs/RECOVERY.md and docs/iterations/0.1.0.md for verification.
