const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const projectIds = ['vesserith', 'mynyra', 'nyvora', 'hova', 'wadewolfie'];

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
  'One namespace.',
  'Four independent systems.',
  'Reconciliation pending',
  'Runtime not qualified',
]) {
  if (!home.includes(required)) throw new Error(`/: missing ${required}`);
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
