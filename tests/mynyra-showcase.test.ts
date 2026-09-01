import assert from 'node:assert/strict';
import test from 'node:test';

import rawShowcase from '../registry/mynyra-showcase.json' with { type: 'json' };
import {
  mynyraShowcase,
  validateMynyraShowcase,
} from '../lib/mynyra-showcase.ts';

void test('accepts the curated, commit-pinned Mynyra showcase', () => {
  assert.equal(mynyraShowcase.projectId, 'mynyra');
  assert.equal(
    mynyraShowcase.source.revision,
    '3c02009897dd552f1a0592afe15c602baa882aea',
  );
  assert.equal(mynyraShowcase.source.reviewedAt, '2026-08-31');
  assert.deepEqual(
    mynyraShowcase.pipeline.map((stage) => stage.id),
    ['manifest', 'replay', 'evidence'],
  );
  assert.deepEqual(
    mynyraShowcase.signals.map((signal) => [signal.id, signal.value]),
    [
      ['mode', 'BACKTEST only'],
      ['provider', 'Disabled'],
      ['orders', 'Disabled'],
      ['backend', 'None'],
    ],
  );
});

void test('rejects identity, revision, ordering, and unsafe fields', () => {
  const wrongProject = structuredClone(rawShowcase);
  wrongProject.projectId = 'hova';
  assert.throws(() => validateMynyraShowcase(wrongProject), /projectId/);

  const wrongRevision = structuredClone(rawShowcase);
  wrongRevision.source.revision = '0'.repeat(40);
  assert.throws(() => validateMynyraShowcase(wrongRevision), /revision/);

  const reordered = structuredClone(rawShowcase);
  [reordered.pipeline[0], reordered.pipeline[1]] = [
    reordered.pipeline[1],
    reordered.pipeline[0],
  ];
  assert.throws(() => validateMynyraShowcase(reordered), /expected manifest/);

  const unsafe = structuredClone(rawShowcase) as Record<string, unknown>;
  unsafe.liveQuotes = [];
  assert.throws(() => validateMynyraShowcase(unsafe), /unsupported field/);
});
