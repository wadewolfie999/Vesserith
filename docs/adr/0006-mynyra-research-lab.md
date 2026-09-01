# ADR 0006: Mynyra research lab

- Status: accepted for the Vesserith Pages presentation
- Date: 2026-09-02

## Decision

Vesserith publishes a curated, commit-pinned Mynyra research-lab exhibit as a
derived public presentation. The exhibit is owned by Vesserith and is not a
runtime dependency of Mynyra. It presents the reviewed offline `BACKTEST`
proof boundary through three factual stages: run manifest, offline replay, and
evidence envelope.

The exhibit explicitly reports provider access, order capability, and product
backend as disabled or absent. It contains no live quotes, trades, balances,
positions, account data, credentials, private endpoints, or operational
controls. Mynyra remains authoritative for its implementation and evidence;
the Vesserith copy is a public snapshot pinned to revision
`3c02009897dd552f1a0592afe15c602baa882aea`, reviewed on 2026-08-31.

## Consequences

The dashboard can give Mynyra visual priority without implying live operation.
The exhibit can be refreshed by a reviewed Vesserith change, while Mynyra's
repository and runtime remain untouched. Any future semi-dynamic evidence
publication requires a separate review and must preserve the offline boundary.
