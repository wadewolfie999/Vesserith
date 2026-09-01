# ADR 0002: Public surface responsibilities

- Status: Superseded by ADR 0005
- Date: 2026-08-31
- Evidence epoch: 2026-08-31

## Decision

This record is retained as historical context. ADR 0005 controls the current
GitHub Pages-only public program; none of the future routing described below is
active roadmap.

The ecosystem surfaces have distinct responsibilities:

| Surface             | Responsibility                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- |
| GitHub repositories | Source, contracts, configuration, ADRs, tests, workflows, and change history                  |
| GitHub Wikis        | Human-maintained narrative, onboarding, history, and runbook summaries                        |
| GitHub Pages        | Generated public technical references and commit-bound evidence indexes                       |
| Sites               | Interactive public applications and explicitly authenticated non-operational product surfaces |
| Vesserith domains   | Stable names and direct routing to the owning application                                     |

Wikis and generated output never become the sole source of a contract or
operational claim. Public Sites do not become a trading bus, privileged
infrastructure console, or shared product database.

## Desired routing

- `vesserith.xyz` and `www.vesserith.xyz`: Vesserith hub
- `mynyra.vesserith.xyz`: Mynyra read-only application
- `nyvora.vesserith.xyz`: Nyvora architecture/evidence cockpit
- `hova.vesserith.xyz`: Hova public sign-in shell and authenticated application
- `wadewolfie.vesserith.xyz`: personal profile

The names are desired state only. Each hostname will bind directly to its
owning Site after the DNS zone and Sites custom-domain capability are verified.
No wildcard or central proxy is authorized.
