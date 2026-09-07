# Changes

## 0.2.0 — orientation maps

The opening screen now presents two navigable worlds: Thesis Worldmap and Mynyra
Worldmap. The objective is readable context rather than an always-open text box.
History and What changed are dedicated views with their own back navigation, and
each map exposes clickable signals with an inspector before editing.

- Replaced the form-first layout with a dark, map-oriented visual system.
- Added event-driven worldmap cards, plotted signal nodes, map inspectors, and an
  on-demand context editor.
- Kept saved state, uncertainty, parked work, optimistic revision checks, export,
  and recovery behavior unchanged.

This iteration is a UI and navigation change over schema 1; no migration is needed.

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
