# ADR 0003: Canonical and derived state

- Status: Accepted for the first implementation slice
- Date: 2026-08-31
- Evidence epoch: 2026-08-31

## Decision

The hub displays derived public views and never silently promotes them to
product authority.

| Data                    | Canonical authority                                  | Derived view                            |
| ----------------------- | ---------------------------------------------------- | --------------------------------------- |
| Source, contracts, ADRs | Exact GitHub commit after verification               | Hub, Pages, Wiki summaries              |
| Vesserith registry      | Reviewed registry entry pinned to a source commit    | Rendered project cards and detail pages |
| GitHub freshness        | Reviewed revision in the registry                    | Build-time default-branch snapshot      |
| Mynyra offline proof    | Exact executable, input, configuration, and manifest | Evidence envelope and UI summary        |
| Hova source and records | Undetermined until reconciliation                    | Every current copy or store             |

Evidence claims use four epistemic states: `observed`, `operator-recorded`,
`inferred`, and `unavailable`. Implementation and operation are separate
dimensions.

The GitHub freshness snapshot is never canonical. A revision difference means
only that the observed default-branch SHA differs from the reviewed SHA; it does
not claim ancestry, safety, release status, or adoption.
