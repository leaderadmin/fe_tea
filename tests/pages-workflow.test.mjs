import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
const deploy = workflow.slice(workflow.indexOf('\n  deploy:'));

test('Pages configuration is checked before deployment', () => {
  assert.ok(workflow.includes('\n  deploy:'));
  const configureIndex = deploy.indexOf('uses: actions/configure-pages@v5');
  const deploymentIndex = deploy.indexOf('uses: actions/deploy-pages@v4');
  assert.ok(configureIndex >= 0);
  assert.ok(deploymentIndex > configureIndex);
  assert.ok(!deploy.includes('enablement: true'));
});

test('Pages deployment retains build dependency and scoped permissions', () => {
  assert.match(deploy, /\n    needs: build\n/);
  assert.match(deploy, /\n    permissions:\n      pages: write\n      id-token: write\n/);
  assert.match(deploy, /\n      name: github-pages\n/);
  assert.ok(deploy.includes('url: ${{ steps.deployment.outputs.page_url }}'));
  assert.match(deploy, /\n        id: deployment\n        uses: actions\/deploy-pages@v4/);
});
