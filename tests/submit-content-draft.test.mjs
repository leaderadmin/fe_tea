import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('content submission CLI creates a draft, resolves its category, and submits it for review', async () => {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization, body });

    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/admin/content/categories?per_page=100') {
      response.end(JSON.stringify({ data: [{ id: 12, type: 'post', slug: 'cau-chuyen-tra' }] }));
    } else if (request.url === '/api/admin/content/posts' && request.method === 'POST') {
      response.statusCode = 201;
      response.end(JSON.stringify({ data: { id: 42, title: body.title } }));
    } else if (request.url === '/api/admin/content/posts/42/submit' && request.method === 'POST') {
      response.statusCode = 201;
      response.end(JSON.stringify({ data: { id: 70 } }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ message: 'Not found' }));
    }
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'moc-tra-agent-test-'));

  try {
    const inputPath = join(temporaryDirectory, 'draft.json');
    await writeFile(inputPath, JSON.stringify({
      title: 'Chuyện về trà',
      slug: 'chuyen-ve-tra',
      body: '<p>Nội dung đã kiểm chứng.</p>',
      category_slug: 'cau-chuyen-tra',
      scheduled_at: '2026-10-20T09:00:00+07:00',
    }));

    const process = spawn(globalThis.process.execPath, [
      new URL('../scripts/submit-content-draft.mjs', import.meta.url).pathname,
      inputPath,
    ], {
      env: {
        ...globalThis.process.env,
        CMS_AGENT_TOKEN: 'test-only-secret',
        CMS_API_BASE_URL: `http://127.0.0.1:${server.address().port}`,
      },
    });
    let stdout = '';
    let stderr = '';
    process.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    process.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    const [exitCode] = await once(process, 'close');

    assert.equal(exitCode, 0, stderr);
    assert.match(stdout, /bản nháp/);
    assert.match(stdout, /chưa được xuất bản/i);
    assert.ok(!stdout.includes('test-only-secret'));
    assert.deepEqual(requests.map(({ method, url }) => [method, url]), [
      ['GET', '/api/admin/content/categories?per_page=100'],
      ['POST', '/api/admin/content/posts'],
      ['POST', '/api/admin/content/posts/42/submit'],
    ]);
    assert.ok(requests.every((request) => request.authorization === 'Bearer test-only-secret'));
    assert.equal(requests[1].body.category_id, 12);
    assert.equal(requests[1].body.scheduled_at, '2026-10-20T09:00:00+07:00');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
