# Workspace baseline: 2026-08-31

This record preserves the evidence used by the first Vesserith implementation
slice. It is not a live operational report.

## Later observation at the same evidence epoch

- The operator created a public, empty GitHub repository at
  `https://github.com/wadewolfie999/Vesserith` under Vahid's
  `wadewolfie999` account.
- The repository page showed no commits and offered initial push instructions,
  so no Git commit can yet be treated as its source baseline.
- This observation does not authorize a remote mutation, push, Pages
  enablement, or publication.

## Repository state

- Vesserith began as an empty, unborn `main` repository with no remote.
- Mynyra public `main` was observed at
  `3c02009897dd552f1a0592afe15c602baa882aea`.
- Nyvora public `main` was observed at
  `dbb7d087dbf4b56e4ba193c3ca93cc3ae918ef63`.
- Hova public `main` was observed at
  `8c3a5bc9c94fa2eae8dbae85bab7b4b9b03b7d68` and contains only its repository
  shell.
- Nyvora's current local `origin` targets Mynyra and must not be used until an
  independently approved repair.
- Existing Nyvora untracked architecture/records and Mynyra `.codex/` content
  were preserved and not modified.

## DNS evidence

The operator supplied a registrar screenshot showing `ns1.parspack.co` and
`ns2.parspack.co` as the required Vesserith nameservers, with
`ns3.parspack.co` and `ns4.parspack.co` available as optional entries.

This corroborates the intended registrar delegation. It does not prove that
the ParsPack DNS zone is authoritative, healthy, or contains valid application
records. Earlier public DNS observation returned `SERVFAIL`; no DNS change is
authorized by this record.

## Product claims

- Mynyra: offline engine plus static UI; no product backend or trading claim.
- Nyvora: v1.0.1 is adopted architecture, not implementation proof;
  v2.0.0-alpha.1 is an unqualified proposal; E1/E2 remain deferred.
- Hova: source and data authority are unresolved; reconciliation precedes
  adoption; the target privacy model is single-user.
- Vesserith: first slice is local, public-data-only, and non-operational.

## Preservation boundary

No product repository, Git remote, GitHub setting, Site, DNS record,
credential, infrastructure component, persistent service, or trading system
was modified while establishing this baseline.
