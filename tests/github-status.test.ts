import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateGitHubStatusSnapshot } from '../lib/github-status.ts';

const source = JSON.parse(
  await readFile(
    new URL('../derived/github-status.json', import.meta.url),
    'utf8',
  ),
);

function clone() {
  return structuredClone(source);
}

void test('accepts the checked-in fail-soft GitHub snapshot', () => {
  const snapshot = validateGitHubStatusSnapshot(clone());
  assert.equal(snapshot.status, 'unavailable');
  assert.equal(snapshot.entries.length, 3);
  assert.ok(snapshot.entries.every((entry) => entry.state === 'unavailable'));
});

void test('rejects a false reviewed-revision match', () => {
  const candidate = clone();
  candidate.entries[0].state = 'reviewed-match';
  candidate.entries[0].observedDefaultBranch = 'main';
  candidate.entries[0].observedDefaultRevision = 'a'.repeat(40);
  candidate.entries[0].observedAt = '2026-08-31T00:00:00.000Z';
  assert.throws(
    () => validateGitHubStatusSnapshot(candidate),
    /reviewed-match requires equal revisions/,
  );
});

void test('rejects claimed observation data in an unavailable entry', () => {
  const candidate = clone();
  candidate.entries[0].observedDefaultBranch = 'main';
  assert.throws(
    () => validateGitHubStatusSnapshot(candidate),
    /unavailable entries cannot claim an observed revision/,
  );
});

void test('rejects observed revisions without an observation time', () => {
  const candidate = clone();
  candidate.source = 'github-api';
  candidate.generatedAt = '2026-08-31T00:00:00.000Z';
  candidate.status = 'partial';
  candidate.entries[0].state = 'reviewed-match';
  candidate.entries[0].observedDefaultBranch = 'main';
  candidate.entries[0].observedDefaultRevision =
    candidate.entries[0].reviewedRevision;
  assert.throws(
    () => validateGitHubStatusSnapshot(candidate),
    /observed entries require an observation time/,
  );
});

void test('rejects an empty snapshot', () => {
  const candidate = clone();
  candidate.entries = [];
  assert.throws(
    () => validateGitHubStatusSnapshot(candidate),
    /must not be empty/,
  );
});
