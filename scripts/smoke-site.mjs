const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const projectIds = ['vesserith', 'mynyra', 'hova'];
const removedProjectIds = ['nyvora', 'wadewolfie'];

async function page(path, expectedStatus = 200) {
  const response = await fetch(new URL(path, baseUrl));
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(
      `${path}: expected ${expectedStatus}, received ${response.status}`,
    );
  }
  if (text.includes('id="__next_error__"')) {
    throw new Error(`${path}: rendered the framework error shell`);
  }
  return text;
}

const home = await page('/');
for (const required of [
  '<main id="content"',
  'aria-label="Primary navigation"',
  'Three projects.',
  'One evidence view.',
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
  if (!home.includes(required)) throw new Error(`/: missing ${required}`);
}
if (!home.includes('href="#mynyra"') || !home.includes('href="#evidence"')) {
  throw new Error('/: missing Mynyra or Evidence anchor');
}
if (
  home.indexOf('Mynyra research lab') >=
  home.indexOf('Three projects, reviewed independently.')
) {
  throw new Error('/: Mynyra lab is not before project evidence');
}
if (
  home.indexOf('Three projects, reviewed independently.') >=
  home.indexOf('Freshness without moving the evidence baseline.')
) {
  throw new Error('/: freshness is not after project evidence');
}

for (const forbidden of [
  ['vesserith', 'xyz'].join('.'),
  'Nyvora',
  'Personal profile',
  '/projects/wadewolfie/',
]) {
  if (home.includes(forbidden)) throw new Error(`/: contains ${forbidden}`);
}
if (!home.includes('property="og:image"'))
  throw new Error('/: missing social-preview metadata');

for (const id of projectIds) {
  const detail = await page(`/projects/${id}`);
  if (
    !detail.includes('Evidence basis') ||
    !detail.includes('Authority boundaries')
  ) {
    throw new Error(`/projects/${id}: missing evidence sections`);
  }
}

for (const id of removedProjectIds) {
  await page(`/projects/${id}`, 404);
}

await page('/projects/not-in-registry', 404);

const provenanceResponse = await fetch(
  new URL('/.well-known/vesserith-build.json', baseUrl),
);
if (!provenanceResponse.ok)
  throw new Error('build provenance endpoint is unavailable');
const provenance = await provenanceResponse.json();
if (
  provenance.projectId !== 'vesserith' ||
  provenance.registrySchema !== 'ecosystem-registry/v1' ||
  provenance.sourceCommit !== 'local-uncommitted'
) {
  throw new Error('build provenance endpoint returned an unexpected contract');
}

console.log(
  `Site smoke passed: root, ${projectIds.length} detail pages, 404, and build provenance.`,
);
