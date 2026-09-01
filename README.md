# Vesserith

Vesserith is the public evidence map and navigation layer for the Vesserith,
Mynyra, Nyvora, Hova, and wadewolfie surfaces.

This repository deliberately does not own product runtime state, credentials,
private records, trading authority, or a shared product database.

## Local development

Requirements: Node.js 22.13 or newer and npm.

```sh
npm install
npm run dev
```

The local site is normally available at `http://localhost:3000`.

## Verification

Run the checks independently so a failure remains attributable:

```sh
npm run validate:registry
npm test
npm run verify:public
npm run lint
npm run build
npm run smoke
```

`npm run smoke` expects the local development server to be running. Set
`BASE_URL` only when testing an explicitly trusted preview origin.

## GitHub Pages build

The first public release is a static GitHub Pages artifact. A project-path
build can be reproduced locally without publishing anything:

```sh
VESSERITH_BASE_PATH=/Vesserith \
VESSERITH_PUBLIC_ORIGIN=https://wadewolfie999.github.io/Vesserith \
VESSERITH_SOURCE_COMMIT=0000000000000000000000000000000000000000 \
VESSERITH_BUILD_TIMESTAMP=2026-08-31T00:00:00Z \
VESSERITH_BUILD_ENVIRONMENT=github-pages-local \
npm run build:pages

VESSERITH_BASE_PATH=/Vesserith \
VESSERITH_SOURCE_COMMIT=0000000000000000000000000000000000000000 \
npm run verify:pages
```

The checked-in GitHub status snapshot is an unavailable fallback. The Pages
workflow attempts to refresh it during each verified `main` publication and
once daily. Lookup failures do not replace or invalidate the commit-pinned
registry, and visitors never query GitHub directly.

The public repository now exists at
`https://github.com/wadewolfie999/Vesserith`, but it has no commit baseline.
The workflow remains inactive until the source is pushed with explicit
approval and GitHub Pages is enabled through Actions. `vesserith.xyz` remains
untouched and reserved for a later Sites application that passes the
capability and ownership gates.

## Public contracts

- `registry/projects.json` is the checked-in public ecosystem view.
- `schemas/ecosystem-registry-v1.json` describes that registry.
- `schemas/public-evidence-v1.json` describes future sanitized evidence.
- `schemas/github-status-snapshot-v1.json` describes the derived, fail-soft
  GitHub freshness snapshot.
- `/.well-known/vesserith-build.json` exposes non-secret build provenance.

The registry pins exact public source revisions. It does not make Vesserith
canonical for the products it describes.

## Current authorization boundary

The current implementation and workflow are local-only. It has no authentication,
persistence, analytics, product API, operational control, deployment, or DNS
authority. GitHub publication, Sites deployment, and DNS changes are separate
approval gates.
