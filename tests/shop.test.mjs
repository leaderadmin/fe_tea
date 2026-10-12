import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { shop, packages, teaPhotos, editorialPhotos, getPackage, getTeaPhoto, buildOrderMessage, renderProductVisual, renderProductGallery, renderProductCard, renderOrderDialog, renderHeader, renderFooter } from '../shop.js';

test('catalog has unique supported package IDs and weights', () => {
  assert.equal(new Set(packages.map(item => item.id)).size, 3);
  assert.deepEqual(packages.map(item => item.weight), ['100 g', '250 g', '500 g']);
  for (const item of packages) assert.equal(getPackage(item.id), item);
  assert.equal(getPackage('unknown'), undefined);
  assert.equal(getPackage(''), undefined);
});

test('all package messages contain exact selections and no automatic confirmation', () => {
  for (const item of packages) {
    const message = buildOrderMessage(item.weight, 2, '  Mình muốn trà đậm.  ');
    assert.ok(message.includes(`Gói trà muốn hỏi: ${item.weight}\nSố lượng: 2 gói`));
    assert.ok(message.includes('xác nhận giá, quy cách đang bán, phí giao hàng'));
    assert.ok(message.endsWith('Lời nhắn: Mình muốn trà đậm.'));
    assert.ok(!message.includes('Đã đặt hàng'));
  }
  assert.ok(!buildOrderMessage('100 g', 1).includes('Lời nhắn:'));
});

test('quantity bounds are inclusive and invalid quantities rejected', () => {
  assert.doesNotThrow(() => buildOrderMessage('100 g', 1));
  assert.doesNotThrow(() => buildOrderMessage('500 g', 100));
  for (const quantity of [0, -1, 1.5, 101, NaN, Infinity, '2', null]) {
    assert.throws(() => buildOrderMessage('100 g', quantity), /số lượng nguyên/);
  }
});

test('unknown packages and overly long notes explicitly rejected', () => {
  assert.throws(() => buildOrderMessage('1 kg', 1), /Gói trà không hợp lệ/);
  assert.throws(() => buildOrderMessage('100 g', 1, 'x'.repeat(501)), /500 ký tự/);
  assert.throws(() => buildOrderMessage('100 g', 1, null), /500 ký tự/);
  assert.doesNotThrow(() => buildOrderMessage('100 g', 1, 'x'.repeat(500)));
});

test('customer notes remain plain message text', () => {
  const note = '<img src=x onerror=alert(1)>';
  assert.ok(buildOrderMessage('250 g', 3, note).endsWith(note));
});

test('cards link to actual detail pages and do not invent prices', () => {
  for (const item of packages) {
    const html = renderProductCard(item);
    assert.ok(html.includes(`href="chi-tiet-tra.html?goi=${item.id}"`));
    assert.ok(html.includes(`data-package="${item.weight}"`));
    assert.ok(html.includes('Liên hệ báo giá'));
    assert.ok(html.includes('Xem chi tiết gói trà'));
  }
});

test('supplied photos exist and use valid dimensions and descriptive alternatives', async () => {
  assert.equal(new Set(teaPhotos.map(photo => photo.id)).size, teaPhotos.length);
  for (const photo of [...teaPhotos, ...editorialPhotos]) {
    await access(new URL(`../${encodeURI(photo.src)}`, import.meta.url));
    assert.ok(photo.width > 0 && photo.height > 0);
    assert.ok(photo.alt.length > 10);
  }
  assert.equal(getTeaPhoto('unknown'), undefined);
});

test('every package uses a supplied photo instead of an invented pouch', () => {
  for (const item of packages) {
    const photo = getTeaPhoto(item.photoId);
    assert.ok(photo);
    const html = renderProductVisual(item);
    assert.ok(html.includes(`src="${encodeURI(photo.src)}"`));
    assert.ok(html.includes(`alt="${photo.alt}"`));
    assert.ok(html.includes(`width="${photo.width}" height="${photo.height}"`));
    assert.ok(html.includes('loading="lazy"'));
    assert.ok(!html.includes('tea-pouch'));
  }
  assert.throws(() => renderProductVisual({ photoId: 'unknown' }), /Không tìm thấy ảnh/);
});

test('detail gallery contains all photos and marks exactly one selected thumbnail', () => {
  for (const item of packages) {
    const html = renderProductGallery(item);
    assert.equal((html.match(/data-photo=/g) || []).length, teaPhotos.length);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    assert.ok(html.includes(`data-photo="${item.photoId}"`));
    assert.ok(html.includes('loading="eager"'));
    assert.ok(html.includes('Không xác định khối lượng') || html.includes('không xác định quy cách'));
  }
});

test('confirmed contact and shared navigation remain consistent', () => {
  assert.equal(shop.zaloUrl, 'https://zalo.me/0344789803');
  assert.equal(shop.phoneUrl, 'tel:+84344789803');
  const footer = renderFooter();
  const dialog = renderOrderDialog();
  assert.ok(footer.includes(shop.zaloUrl));
  assert.ok(footer.includes(shop.phoneUrl));
  assert.ok(dialog.includes(shop.zaloUrl));
  assert.ok(dialog.includes('Zalo không tự điền lời nhắn'));
  assert.ok(dialog.includes('Website chưa gửi hay xác nhận đơn tự động'));
  for (const route of ['san-pham.html', 'lien-he.html', 'mua-hang.html']) {
    assert.ok(renderHeader().includes(`href="${route}"`));
    assert.ok(footer.includes(`href="${route}"`));
  }
});
