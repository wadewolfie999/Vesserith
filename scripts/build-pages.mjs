import { spawn } from 'node:child_process';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const vinextCli = fileURLToPath(
  new URL('../node_modules/vinext/dist/cli.js', import.meta.url),
);

const child = spawn(process.execPath, [vinextCli, 'build'], {
  cwd: root,
  env: { ...process.env, VESSERITH_STATIC_EXPORT: '1' },
  stdio: 'inherit',
});

const exitCode = await new Promise((resolveExit, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (signal) reject(new Error(`vinext build ended with signal ${signal}`));
    else resolveExit(code ?? 1);
  });
});

if (exitCode !== 0) process.exit(exitCode);

const outputDirectory = resolve(root, 'dist/client');
const requestedBasePath = process.env.VESSERITH_BASE_PATH?.trim() ?? '';
const basePath =
  requestedBasePath === '' || requestedBasePath === '/'
    ? ''
    : `/${requestedBasePath.replace(/^\/+|\/+$/g, '')}`;

// Vinext writes assets below the configured base path when exporting. GitHub
// Pages already mounts the uploaded directory at that base path, so keeping
// the extra directory would make every /_next asset resolve one level too
// deep (and leave the published HTML unstyled). Flatten the generated asset
// tree before finalizing the Pages artifact.
if (basePath) {
  const nestedBasePathDirectory = resolve(outputDirectory, basePath.slice(1));
  const nestedAssetDirectory = resolve(nestedBasePathDirectory, '_next');
  const assetDirectory = resolve(outputDirectory, '_next');

  try {
    await cp(nestedAssetDirectory, assetDirectory, {
      recursive: true,
      force: true,
    });
    await rm(nestedBasePathDirectory, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const schemaDirectory = resolve(root, 'schemas');
const publishedSchemaDirectory = resolve(outputDirectory, 'schemas');
const schemaFiles = [
  'build-provenance-v1.json',
  'ecosystem-registry-v1.json',
  'github-status-snapshot-v1.json',
  'mynyra-showcase-v1.json',
  'public-evidence-v1.json',
];
const registry = JSON.parse(
  await readFile(resolve(root, 'registry/projects.json'), 'utf8'),
);

for (const project of registry.projects) {
  const source = resolve(outputDirectory, `projects/${project.id}.html`);
  const destinationDirectory = resolve(
    outputDirectory,
    `projects/${project.id}`,
  );
  await mkdir(destinationDirectory, { recursive: true });
  await copyFile(source, resolve(destinationDirectory, 'index.html'));
}

await mkdir(publishedSchemaDirectory, { recursive: true });
for (const schemaFile of schemaFiles) {
  await copyFile(
    resolve(schemaDirectory, schemaFile),
    resolve(publishedSchemaDirectory, schemaFile),
  );
}

const provenance = {
  schema:
    'https://wadewolfie999.github.io/Vesserith/schemas/build-provenance-v1.json',
  projectId: 'vesserith',
  sourceCommit: process.env.VESSERITH_SOURCE_COMMIT ?? 'local-uncommitted',
  buildTimestamp: process.env.VESSERITH_BUILD_TIMESTAMP ?? null,
  environment: process.env.VESSERITH_BUILD_ENVIRONMENT ?? 'local-pages',
  registrySchema: 'ecosystem-registry/v1',
  evidenceSchema: 'public-evidence/v1',
};

if (
  provenance.sourceCommit !== 'local-uncommitted' &&
  !/^[a-f0-9]{40}$/.test(provenance.sourceCommit)
) {
  throw new Error('VESSERITH_SOURCE_COMMIT must be a full lowercase Git SHA');
}
if (
  provenance.buildTimestamp !== null &&
  Number.isNaN(Date.parse(provenance.buildTimestamp))
) {
  throw new Error('VESSERITH_BUILD_TIMESTAMP must be an ISO timestamp');
}

const provenanceDirectory = resolve(outputDirectory, '.well-known');
await mkdir(provenanceDirectory, { recursive: true });
await writeFile(
  resolve(provenanceDirectory, 'vesserith-build.json'),
  `${JSON.stringify(provenance, null, 2)}\n`,
);

console.log(
  `[pages] finalized ${registry.projects.length} clean project routes, ${schemaFiles.length} schemas, and build provenance`,
);
