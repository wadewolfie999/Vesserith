import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(
  new URL('../.github/workflows/pages.yml', import.meta.url),
  'utf8',
);

void test('publishes on main pushes and manual recovery only', () => {
  assert.match(workflow, /push:\n\s+branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
});

void test('refreshes and verifies the Pages artifact before deployment', () => {
  const refresh = workflow.indexOf('npm run refresh:github');
  const build = workflow.indexOf('npm run build:pages');
  const verify = workflow.indexOf('npm run verify:pages');
  const deploy = workflow.indexOf('uses: actions/deploy-pages@v4');

  assert.ok(refresh >= 0);
  assert.ok(refresh < build);
  assert.ok(build < verify);
  assert.ok(verify < deploy);
});
