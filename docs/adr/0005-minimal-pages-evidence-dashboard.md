# ADR 0005: Minimal GitHub Pages evidence dashboard

- Status: Accepted
- Date: 2026-09-01
- Evidence epoch: 2026-09-01
- Supersedes: active external-routing and alternate-hosting portions of ADRs
  0002 and 0004

## Decision

The active Vesserith public product is a static GitHub Pages evidence dashboard
for exactly Vesserith, Mynyra, and Hova.

The dashboard keeps commit-pinned registry evidence, a derived build-time
GitHub revision snapshot, project evidence routes, and public build provenance.
It has no authentication, persistence, product API, private data, or operational
authority.

Publication occurs after verification on pushes to `main`. Manual workflow
dispatch remains available for recovery. There is no scheduled refresh;
visitors never query GitHub directly.

The active registry exposes repository, Wiki, and GitHub Pages links only.
Nyvora and wadewolfie are omitted from this minimal public view without changing
their repositories or historical evidence.

## Contract consequence

The existing v1 schema identifiers move in place to the canonical GitHub Pages
schema directory. This is an explicitly accepted breaking identity change. All
four schemas are included in the published artifact so their identifiers
resolve publicly.

## Recovery

The prior verified publication remains recoverable from commit
`7d953e7198116024a479c9ee31ae4735a90aeb38`. Reverting a later publication
restores the previous registry, routes, and workflow behavior without involving
any product repository or persistent state.
