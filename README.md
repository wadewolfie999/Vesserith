# Vesserith

Vesserith is a public GitHub Pages evidence dashboard for Vesserith, Mynyra,
and Hova.

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

The first public release is live as a static GitHub Pages artifact at
`https://wadewolfie999.github.io/Vesserith/`. A project-path build can be
reproduced locally without publishing anything:

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
workflow attempts to refresh it during each verified `main` publication.
Lookup failures do not replace or invalidate the commit-pinned registry, and
visitors never query GitHub directly.

The public repository is `https://github.com/wadewolfie999/Vesserith`. GitHub
Pages is configured to publish through Actions after validation on updates to
`main`; manual workflow dispatch remains available for recovery.

The four JSON schemas are copied into the Pages artifact under `/schemas/` so
their public identifiers resolve from the canonical Pages URL.

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

The GitHub Pages dashboard is public and read-only. It has no authentication,
persistence, analytics, product API, operational control, private data, or
external routing authority.
