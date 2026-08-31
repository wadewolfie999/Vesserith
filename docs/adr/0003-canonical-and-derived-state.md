# ADR 0003: Canonical and derived state

- Status: Accepted for the first implementation slice
- Date: 2026-08-31
- Evidence epoch: 2026-08-31

## Decision

The hub displays derived public views and never silently promotes them to
product authority.

| Data                    | Canonical authority                                  | Derived view                             |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------- |
| Source, contracts, ADRs | Exact GitHub commit after verification               | Hub, Pages, Wiki summaries               |
| Vesserith registry      | Reviewed registry entry pinned to a source commit    | Rendered project cards and detail pages  |
| Sites application       | Exact source plus deployment configuration           | Deployed assets and browser state        |
| DNS                     | Active authoritative provider zone                   | Desired map in this repository           |
| Mynyra offline proof    | Exact executable, input, configuration, and manifest | Evidence envelope and UI summary         |
| Nyvora v1 architecture  | Adopted v1.0.1 artifact and adoption record          | Legacy implementation and public cockpit |
| Hova source and records | Undetermined until reconciliation                    | Every current copy or store              |

Evidence claims use four epistemic states: `observed`, `operator-recorded`,
`inferred`, and `unavailable`. Implementation and operation are separate
dimensions.

Nyvora v2.0.0-alpha.1's accepted-event canonical-state rule applies only to a
future isolated conformance harness until a new baseline is explicitly adopted.
