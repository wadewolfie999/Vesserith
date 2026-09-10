# ADR 0007: Local personal orientation

Status: accepted by the user, 2026-09-07.

Vesserith is now a local personal orientation app. This supersedes the active
Vesserith product responsibilities and public presentation decisions in ADRs
0001–0006. Those files remain historical; they are not the current roadmap.
Other projects continue to own their own runtime, data, and execution authority.

Vesserith owns local orientation records, explicit uncertainties, decisions, and
references. SQLite is authoritative for these records; Git owns app source,
version protocol, migrations, and release history. Personal records are not public
registry entries. No publication workflow or hosted runtime is active in this source.
React/Vite plus Flask/Waitress serves only loopback. No domain or remote-host change
is part of this decision. Existing externally published artifacts were not removed.
