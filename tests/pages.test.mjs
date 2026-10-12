import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('deploy checks Pages configuration before publishing the artifact', async () => {
  const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  const deploy = workflow.slice(workflow.indexOf('\n  deploy:'));
  assert.match(deploy, /needs: build/);
  assert.match(deploy, /pages: write/);
  assert.match(deploy, /id-token: write/);
  assert.match(deploy, /uses: actions\/configure-pages@v5\s+- name: Deploy website\s+id: deployment\s+uses: actions\/deploy-pages@v4/);
  assert.doesNotMatch(deploy, /enablement:\s*true|continue-on-error:\s*true/);
});
