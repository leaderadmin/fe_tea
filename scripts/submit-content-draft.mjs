import { readFile } from 'node:fs/promises';

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return [];
    const separator = trimmed.indexOf('=');
    if (separator < 1) return [];
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    return [[key, value]];
  }));
}

async function loadAgentConfig() {
  let fileConfig = {};
  try {
    fileConfig = parseEnv(await readFile(new URL('../.env.agent', import.meta.url), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const token = process.env.CMS_AGENT_TOKEN || fileConfig.CMS_AGENT_TOKEN;
  if (!token || token === 'replace-with-a-token-from-cms-issue-content-agent-token') {
    throw new Error('Thiếu CMS_AGENT_TOKEN. Tạo .env.agent từ .env.agent.example và lưu token agent vào đó.');
  }

  return {
    baseUrl: (process.env.CMS_API_BASE_URL || fileConfig.CMS_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, ''),
    token,
  };
}

async function requestJson(config, path, options = {}) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const responseText = await response.text();
  let result;
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(`CMS API trả về dữ liệu không phải JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result.message || `CMS API từ chối yêu cầu (HTTP ${response.status}).`);
  }
  return result;
}

function requiredString(payload, name) {
  if (typeof payload[name] !== 'string' || !payload[name].trim()) {
    throw new Error(`Thiếu trường bắt buộc "${name}" trong file nội dung.`);
  }
  return payload[name].trim();
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Cách dùng: npm run content:submit -- content/inbox/bai-viet.json');

  const config = await loadAgentConfig();
  const input = JSON.parse(await readFile(filePath, 'utf8'));
  const payload = {
    title: requiredString(input, 'title'),
    slug: requiredString(input, 'slug'),
    body: requiredString(input, 'body'),
    excerpt: input.excerpt || null,
    cover_url: input.cover_url || null,
    category_id: input.category_id || null,
    seo_title: input.seo_title || null,
    seo_description: input.seo_description || null,
    scheduled_at: input.scheduled_at || null,
  };

  if (input.category_slug) {
    const categories = await requestJson(config, '/api/admin/content/categories?per_page=100');
    const category = categories.data?.find((item) => item.type === 'post' && item.slug === input.category_slug);
    if (!category) throw new Error(`Không tìm thấy danh mục bài viết "${input.category_slug}".`);
    payload.category_id = category.id;
  }

  const created = await requestJson(config, '/api/admin/content/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const post = created.data;
  if (!post?.id) throw new Error('CMS không trả về mã bài viết sau khi tạo bản nháp.');

  try {
    await requestJson(config, `/api/admin/content/posts/${post.id}/submit`, { method: 'POST' });
  } catch (error) {
    throw new Error(`Đã tạo bản nháp #${post.id}, nhưng không gửi được để duyệt: ${error.message}`);
  }

  console.log(`Đã tạo bản nháp "${post.title}" (#${post.id}) và gửi vào CMS → Duyệt nội dung.`);
  console.log('Bài chưa được xuất bản. Admin cần duyệt; lịch đăng chỉ có hiệu lực sau khi được duyệt.');
}

await main();
