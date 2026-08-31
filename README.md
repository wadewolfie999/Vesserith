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

## Public contracts

- `registry/projects.json` is the checked-in public ecosystem view.
- `schemas/ecosystem-registry-v1.json` describes that registry.
- `schemas/public-evidence-v1.json` describes future sanitized evidence.
- `/.well-known/vesserith-build.json` exposes non-secret build provenance.

The registry pins exact public source revisions. It does not make Vesserith
canonical for the products it describes.

## Current authorization boundary

The current implementation is local-only. It has no authentication,
persistence, analytics, product API, operational control, deployment, or DNS
authority. GitHub publication, Sites deployment, and DNS changes are separate
approval gates.
