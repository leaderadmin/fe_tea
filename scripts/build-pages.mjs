import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = resolve(root, '_site');
const pages = [
  'index.html',
  'san-pham.html',
  'chi-tiet-tra.html',
  'lien-he.html',
  'mua-hang.html',
  'styles.css',
  'shop.css',
  'app.js',
  'shop.js',
  'assets/leaf.svg',
  'assets/tea-hills.svg',
  'assets/fieldhand-landscape.jpg',
  'assets/fieldhand-cloud.jpg',
  'assets/doi-che-thai-nguyen.jpg',
  'assets/doi-che-thai-nguyen-1.jpg',
  'assets/images (3).jpeg',
  'assets/images (4).jpeg',
  'assets/images (6).jpeg',
  'assets/images (7).jpeg',
  'assets/images (8).jpeg',
  'assets/images (10).jpeg',
  'assets/images (11).jpeg'
];

for (const path of pages) {
  const source = resolve(root, path);
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

await writeFile(resolve(output, '.nojekyll'), '');
console.log(`Prepared ${pages.length} public files in _site.`);
