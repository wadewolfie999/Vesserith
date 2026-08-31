# ADR 0001: Federated product ownership

- Status: Accepted for the first implementation slice
- Date: 2026-08-31
- Evidence epoch: 2026-08-31

## Context

Mynyra contains an independent static product UI and imported engine. Nyvora
has an adopted architecture but no conforming deployed runtime. The declared
Hova repository is a shell while several adjacent Tracker lineages and stores
remain unreconciled. Vesserith began empty.

A shared application database or central operational service would therefore
assign authority before the underlying projects have established compatible
state and security contracts.

## Decision

Vesserith is a thin coordination layer. Mynyra, Nyvora, and Hova independently
own their applications, contracts, data, deployments, security boundaries, and
recovery.

Vesserith owns:

- the public namespace and desired domain map;
- the ecosystem registry and common status vocabulary;
- shared navigation and public presentation conventions; and
- cross-repository decisions about integration boundaries.

Vesserith does not own product records, trading state, Nyvora kernel state,
Hova private data, or shared credentials.

## Consequences

- Product failures and rollbacks remain isolated.
- Cross-repository integration uses small, versioned public contracts.
- Registry drift is possible and must be made visible through source revisions
  and review dates.
- A shared platform or Nyvora runtime may be introduced only after independent
  evidence shows repeated compatible requirements.
