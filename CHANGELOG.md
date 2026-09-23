# Changes

## 3.0.0 — 2026-09-23 UTC

- Account-based learning Observatory for the existing GitHub Pages address;
  React/TypeScript/Vite replaces the superseded local orientation interface.
- Identity-only GitHub OAuth through Supabase, private PostgreSQL state and RLS,
  transactional RPCs, revisions, idempotent retries, account recovery drafts,
  and reviewed Nightpath/Vesserith context imports.
- Personal trail editor, English route codes, configurable gates, connections,
  archive/restore/Trash, positioning, and confirmed curriculum resets.
- Terrain, lenses, notes, guided MCP Concept Graph, Deferred guidance, and Route D
  scenario. New accounts start neutral without the owner's learning context.
- Lockfile-based Pages workflow and allow-listed static artifact verification.
  Removed the unused Sites manifest; legacy sources and migration data remain.

Released at the existing GitHub Pages URL. Application source:
`ff51f691b4c157edc32325e3d012d2df3df3b279`; successful publishing run
[35923545001](https://github.com/wadewolfie999/Vesserith/actions/runs/35923545001),
deployment `6624999152`, confirmed **2026-09-23 21:37:42 UTC**.
Production GitHub sign-in, logout/relogin, private two-account state, note
persistence/clearing, six imported owner notes, assets, and console were verified
after deployment. Full evidence and its limits: [v3 ledger](docs/V3_RELEASE.md).

## 0.2.1 — ultra-minimal copy

The interface now favors short labels, data, and direct controls. Orientation
semantics, complete release notes, and saved records are unchanged.

- Removed repeated guidance and descriptive map copy.
- Opening view now shows the objective, focus, and chosen action.
- Kept schema 1; no migration is needed.

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
