import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
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

const provenance = {
  schema: 'https://vesserith.xyz/schemas/build-provenance-v1.json',
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
  `[pages] finalized ${registry.projects.length} clean project routes and build provenance`,
);
