import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schemaFiles = [
  'build-provenance-v1.json',
  'ecosystem-registry-v1.json',
  'github-status-snapshot-v1.json',
  'public-evidence-v1.json',
];
const schemaBase = 'https://wadewolfie999.github.io/Vesserith/schemas/';

for (const schemaFile of schemaFiles) {
  void test(`${schemaFile} uses its public Pages identity`, async () => {
    const schema = JSON.parse(
      await readFile(
        new URL(`../schemas/${schemaFile}`, import.meta.url),
        'utf8',
      ),
    );
    assert.equal(schema.$id, `${schemaBase}${schemaFile}`);
    assert.equal(schema.properties.schema.const, schema.$id);
  });
}

void test('collection schemas require exactly three projects', async () => {
  const registrySchema = JSON.parse(
    await readFile(
      new URL('../schemas/ecosystem-registry-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const snapshotSchema = JSON.parse(
    await readFile(
      new URL('../schemas/github-status-snapshot-v1.json', import.meta.url),
      'utf8',
    ),
  );

  assert.equal(registrySchema.properties.projects.minItems, 3);
  assert.equal(registrySchema.properties.projects.maxItems, 3);
  assert.equal(snapshotSchema.properties.entries.minItems, 3);
  assert.equal(snapshotSchema.properties.entries.maxItems, 3);
});
