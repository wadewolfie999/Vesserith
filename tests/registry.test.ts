import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateRegistry } from '../lib/registry-validation.ts';

const source = JSON.parse(
  await readFile(new URL('../registry/projects.json', import.meta.url), 'utf8'),
);

function clone() {
  return structuredClone(source);
}

void test('accepts the checked-in ecosystem registry', () => {
  const registry = validateRegistry(clone());
  assert.equal(registry.projects.length, 5);
  assert.deepEqual(registry.projects.map((project) => project.id).sort(), [
    'hova',
    'mynyra',
    'nyvora',
    'vesserith',
    'wadewolfie',
  ]);
});

void test('rejects unknown project identities', () => {
  const candidate = clone();
  candidate.projects[0].id = 'invented';
  assert.throws(() => validateRegistry(candidate), /unknown project invented/);
});

void test('rejects non-HTTPS public links', () => {
  const candidate = clone();
  candidate.projects[1].source.repository =
    'http://github.com/wadewolfie999/Mynyra';
  assert.throws(() => validateRegistry(candidate), /must use HTTPS/);
});

void test('rejects abbreviated source revisions', () => {
  const candidate = clone();
  candidate.projects[1].source.revision = '3c020098';
  assert.throws(() => validateRegistry(candidate), /full lowercase Git SHA/);
});

void test('rejects verified operation for a repository shell', () => {
  const candidate = clone();
  candidate.projects[3].operation.state = 'verified';
  assert.throws(
    () => validateRegistry(candidate),
    /shell cannot claim verified operation/,
  );
});

void test('requires observed evidence for verified operation', () => {
  const candidate = clone();
  candidate.projects[1].operation.state = 'verified';
  candidate.projects[1].evidence.state = 'operator-recorded';
  assert.throws(
    () => validateRegistry(candidate),
    /verified operation requires observed evidence/,
  );
});

void test('rejects duplicated project identities', () => {
  const candidate = clone();
  candidate.projects[4] = structuredClone(candidate.projects[3]);
  assert.throws(
    () => validateRegistry(candidate),
    /project IDs must be unique/,
  );
});

void test('rejects an invented domain mapping', () => {
  const candidate = clone();
  candidate.projects[2].surfaces.domain = 'kernel.vesserith.xyz';
  assert.throws(
    () => validateRegistry(candidate),
    /must be nyvora\.vesserith\.xyz/,
  );
});
