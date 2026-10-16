import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' };
const routeFiles = new Map([
  ['/', 'index.html'],
  ['/san-pham', 'san-pham.html'],
  ['/chi-tiet-tra', 'chi-tiet-tra.html'],
  ['/lien-he', 'lien-he.html'],
  ['/mua-hang', 'mua-hang.html'],
]);
const publicFiles = new Set(['index.html', 'san-pham.html', 'chi-tiet-tra.html', 'lien-he.html', 'mua-hang.html', 'styles.css', 'shop.css', 'app.js', 'shop.js', 'assets/tea-hills.svg', 'assets/tea-cup.svg', 'assets/leaf.svg', 'assets/fieldhand-landscape.jpg', 'assets/fieldhand-cloud.jpg', 'assets/doi-che-thai-nguyen.jpg', 'assets/doi-che-thai-nguyen-1.jpg', 'assets/images.jpeg', ...Array.from({ length: 11 }, (_, index) => `assets/images (${index + 1}).jpeg`)]);

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/\/+$/, '') || '/';
    const relative = routeFiles.get(pathname) || pathname.slice(1);
    const filename = resolve(root, relative);
    if (!filename.startsWith(root + sep) || !publicFiles.has(relative)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Không tìm thấy trang.');
      return;
    }
    const content = await readFile(filename);
    response.writeHead(200, { 'Content-Type': types[extname(filename)] || 'application/octet-stream' });
    response.end(content);
  } catch (error) {
    console.error('Không thể phục vụ yêu cầu:', error);
    response.writeHead(error instanceof URIError ? 400 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Không thể tải nội dung. Vui lòng thử lại.');
  }
}).listen(port, '127.0.0.1', () => console.log(`Mộc Trà: http://127.0.0.1:${port}`));
