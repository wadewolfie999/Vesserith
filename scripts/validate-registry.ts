import { readFile } from 'node:fs/promises';

import { validateRegistry } from '../lib/registry-validation.ts';

const raw = JSON.parse(
  await readFile(new URL('../registry/projects.json', import.meta.url), 'utf8'),
);
const registry = validateRegistry(raw);

console.log(
  `Registry valid: ${registry.projects.length} projects at evidence epoch ${registry.evidenceEpoch}`,
);
