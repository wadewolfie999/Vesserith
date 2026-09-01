import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve(process.env.PAGES_OUTPUT_DIR ?? 'dist/client');
const requestedBasePath = process.env.VESSERITH_BASE_PATH?.trim() ?? '';
const basePath =
  requestedBasePath === '' || requestedBasePath === '/'
    ? ''
    : `/${requestedBasePath.replace(/^\/+|\/+$/g, '')}`;
const projectIds = ['vesserith', 'mynyra', 'nyvora', 'hova', 'wadewolfie'];

async function requireFile(path) {
  const absolute = resolve(outputDirectory, path);
  await access(absolute);
  return readFile(absolute, 'utf8');
}

const home = await requireFile('index.html');
const notFound = await requireFile('404.html');
await requireFile('.nojekyll');

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

for (const required of [
  'One namespace.',
  'Four independent systems.',
  'Derived GitHub snapshot',
  'GitHub Pages live',
  'Reconciliation pending',
  'Runtime not qualified',
]) {
  if (!home.includes(required))
    throw new Error(`index.html is missing ${required}`);
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

console.log(
  `Pages artifact verified: root, ${projectIds.length} detail pages, 404, no-Jekyll marker, base path, and provenance.`,
);
