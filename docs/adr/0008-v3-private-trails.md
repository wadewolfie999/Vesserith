# ADR 0008 — Private account trails

Status: accepted implementation direction; release verification pending.

## Decision

GitHub Pages serves React assets at /Vesserith/. Supabase Auth performs GitHub
identity-only PKCE login; PostgreSQL owns private curricula, progress, notes, and
durable UI state. This replaces the old single-device Flask/SQLite runtime.

A custom same-origin backend could provide cookie sessions but requires another
hosting/runtime surface. Browser-only storage cannot enforce isolation or shared
account persistence. Supabase keeps frontend hosting static while enforcing
ownership outside the browser, suitable for the initial 10–20 learners.

## Invariants

- Ownership derives from auth.uid(), never submitted owner IDs or email matches.
- RLS and owner-scoped keys protect reads; direct client writes are revoked.
  Narrow fixed-search-path RPCs validate limits, ownership, revisions, graph
  rules, and idempotency inside transactions.
- Notes and mastery have independent revisions; topology has one atomic revision.
  Unavailable storage and conflicting writes never produce save-success feedback.
- Active trails are acyclic. Routes are terminal. Archived prerequisite paths
  remain retained, and affected gates are unavailable rather than silently ready.
- Navigation uses last-interaction-wins; text and topology conflicts are reviewed.
  Cursor, composition, drag, and destructive confirmation state stay local.
- Imports are previewed against current revisions. Original browser keys, local
  databases, and other accounts remain untouched. Recovery drafts are user-scoped.
- Public artifacts contain only static assets and publishable configuration.
  Personal exports, private notes, snapshots, and provider secrets stay out.

## Operations and reversibility

Applied SQL migrations are immutable. Corrections are additive migrations tested
in isolation first; preserve data and take a private backup before data-affecting
changes. Frontend rollback uses a verified previous Pages artifact and does not
delete account data or reverse SQL. The historical pre-v3 commit is not assumed
compatible with the v3 build workflow. Retain the old deployment until its
replacement passes acceptance. Embedded auth stubs are not evidence of the
required two real-account OAuth/isolation test.
