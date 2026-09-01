# ADR 0004: GitHub Pages first, Sites by capability gate

- Status: Superseded by ADR 0005
- Date: 2026-08-31
- Evidence epoch: 2026-08-31

## Decision

This record preserves the broader publication direction considered during the
first release. ADR 0005 now controls the active Pages-only dashboard.

The first public Vesserith hub will be a generated static GitHub Pages artifact
published from verified `main` at GitHub's default project URL. The apex domain
remains reserved for a future Sites application.

GitHub Pages and Sites will coexist:

- Pages owns durable, commit-bound public evidence and reference output.
- Sites is introduced only when an approved feature genuinely requires
  interactivity, authentication, or persistence and Vahid's Sites ownership is
  verified.
- DNS is not changed merely to launch Pages.

The canonical registry remains reviewed and commit-pinned. A build-time GitHub
snapshot may show whether a repository's default-branch revision still matches
the reviewed revision. The snapshot is visibly derived, timestamped, and
fail-soft: publication continues with the checked-in unavailable state when the
GitHub lookup fails.

The initial repository is intended to live under `wadewolfie999`. A future
transfer to a Vesserith GitHub organization is allowed only through a separate
recorded migration with link, Pages, permissions, and recovery verification.

## Consequences

- Visitors never query GitHub directly, avoiding client-side rate limits and
  variable page behavior.
- Pushes to verified `main` and a daily schedule rebuild the public snapshot.
- A Sites account switch cannot change the source authority or block continued
  development.
- The backlog may later expand Pages into a consolidated technical reference,
  but that scope is not part of the first publication gate.
