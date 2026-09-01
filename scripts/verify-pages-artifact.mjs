import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.env.PAGES_OUTPUT_DIR ?? 'dist/client');
const requestedBasePath = process.env.VESSERITH_BASE_PATH?.trim() ?? '';
const basePath =
  requestedBasePath === '' || requestedBasePath === '/'
    ? ''
    : `/${requestedBasePath.replace(/^\/+|\/+$/g, '')}`;
const projectIds = ['vesserith', 'mynyra', 'hova'];
const removedProjectIds = ['nyvora', 'wadewolfie'];
const schemaBase = 'https://wadewolfie999.github.io/Vesserith/schemas/';
const schemaFiles = [
  'build-provenance-v1.json',
  'ecosystem-registry-v1.json',
  'github-status-snapshot-v1.json',
  'mynyra-showcase-v1.json',
  'public-evidence-v1.json',
];

async function requireFile(path) {
  const absolute = resolve(outputDirectory, path);
  await access(absolute);
  return readFile(absolute, 'utf8');
}

async function requireMissingFile(path) {
  try {
    await access(resolve(outputDirectory, path));
  } catch {
    return;
  }
  throw new Error(`${path} must not be present in the Pages artifact`);
}

async function requireAsset(path) {
  const assetPath = path.split(/[?#]/, 1)[0];
  if (!assetPath.startsWith(`${basePath}/_next/`)) return;
  await access(resolve(outputDirectory, assetPath.slice(basePath.length + 1)));
}

const home = await requireFile('index.html');
const notFound = await requireFile('404.html');
await requireFile('.nojekyll');

const pages = [home, notFound];
for (const id of projectIds) {
  pages.push(await requireFile(`projects/${id}/index.html`));
}
for (const page of pages) {
  const references = page.matchAll(/(?:href|src)="([^"]+)"/g);
  for (const [, reference] of references) await requireAsset(reference);
}

for (const id of projectIds) {
  const detail = await requireFile(`projects/${id}/index.html`);
  if (
    !detail.includes('Evidence basis') ||
    !detail.includes('Authority boundaries')
  ) {
    throw new Error(`projects/${id}/index.html is missing evidence sections`);
  }
  if (basePath && !detail.includes(`href="${basePath}/"`)) {
    throw new Error(
      `projects/${id}/index.html is missing the base-path return link`,
    );
  }
}

for (const id of removedProjectIds) {
  await requireMissingFile(`projects/${id}/index.html`);
  await requireMissingFile(`projects/${id}.html`);
}

for (const required of [
  'Three projects.',
  'One evidence view.',
  'Derived GitHub snapshot',
  'GitHub Pages live',
  'Reconciliation pending',
  'Mynyra research lab',
  'Run manifest',
  'Offline replay',
  'Evidence envelope',
  'BACKTEST only',
  'Provider access',
  'Order capability',
  'Product backend',
]) {
  if (!home.includes(required))
    throw new Error(`index.html is missing ${required}`);
}

if (
  home.indexOf('Mynyra research lab') >=
  home.indexOf('Three projects, reviewed independently.')
) {
  throw new Error('Mynyra research lab must precede the project map');
}
if (
  home.indexOf('Three projects, reviewed independently.') >=
  home.indexOf('Freshness without moving the evidence baseline.')
) {
  throw new Error('project map must precede the freshness snapshot');
}
if (!home.includes('href="#mynyra"') || !home.includes('href="#evidence"')) {
  throw new Error('home navigation is missing the Mynyra or Evidence anchors');
}

for (const forbidden of [
  ['vesserith', 'xyz'].join('.'),
  'Nyvora',
  'Personal profile',
  '/projects/wadewolfie/',
]) {
  if (home.includes(forbidden)) {
    throw new Error(`index.html contains removed public content: ${forbidden}`);
  }
}

if (basePath && !home.includes(`${basePath}/projects/mynyra/`)) {
  throw new Error(
    `index.html does not contain the expected base path ${basePath}`,
  );
}
if (basePath && !home.includes(`${basePath}/_next/static/`)) {
  throw new Error(
    `index.html assets are missing the expected base path ${basePath}`,
  );
}
if (basePath && !notFound.includes(`href="${basePath}/"`)) {
  throw new Error(`404.html is missing the base-path return link`);
}

const provenance = JSON.parse(
  await requireFile('.well-known/vesserith-build.json'),
);
if (
  provenance.schema !== `${schemaBase}build-provenance-v1.json` ||
  provenance.projectId !== 'vesserith' ||
  provenance.registrySchema !== 'ecosystem-registry/v1' ||
  provenance.evidenceSchema !== 'public-evidence/v1'
) {
  throw new Error('static build provenance has an unexpected contract');
}
if (
  process.env.VESSERITH_SOURCE_COMMIT &&
  provenance.sourceCommit !== process.env.VESSERITH_SOURCE_COMMIT
) {
  throw new Error(
    'static build provenance does not match VESSERITH_SOURCE_COMMIT',
  );
}

for (const schemaFile of schemaFiles) {
  const schema = JSON.parse(await requireFile(`schemas/${schemaFile}`));
  if (schema.$id !== `${schemaBase}${schemaFile}`) {
    throw new Error(`schemas/${schemaFile} has an unexpected $id`);
  }
}

const showcaseSchema = JSON.parse(
  await requireFile('schemas/mynyra-showcase-v1.json'),
);
if (
  showcaseSchema.$id !== `${schemaBase}mynyra-showcase-v1.json` ||
  showcaseSchema.properties?.projectId?.const !== 'mynyra' ||
  showcaseSchema.properties?.mode?.const !== 'BACKTEST'
) {
  throw new Error('Mynyra showcase schema has an unexpected contract');
}

console.log(
  `Pages artifact verified: root, ${projectIds.length} detail pages, removed routes, ${schemaFiles.length} schemas, 404, no-Jekyll marker, base path, and provenance.`,
);
