import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('deploy checks Pages configuration before publishing the built artifact', async () => {
  const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  const deploy = workflow.slice(workflow.indexOf('\n  deploy:'));
  const configureIndex = deploy.indexOf('uses: actions/configure-pages@v5');
  const publishIndex = deploy.indexOf('uses: actions/deploy-pages@v4');

  assert.ok(configureIndex >= 0, 'deploy must check the Pages configuration');
  assert.ok(publishIndex > configureIndex, 'Pages configuration must be checked before deployment');
  assert.match(deploy, /needs: build/);
  assert.match(deploy, /pages: write/);
  assert.match(deploy, /id-token: write/);
  assert.match(deploy, /id: deployment/);
  assert.doesNotMatch(deploy, /enablement:\s*true|secrets\./);
});
