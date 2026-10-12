export const shop = Object.freeze({
  name: 'Mộc Trà',
  phone: '0344789803',
  displayPhone: '0344 789 803',
  zaloUrl: 'https://zalo.me/0344789803',
  phoneUrl: 'tel:+84344789803'
});

export const packages = Object.freeze([
  Object.freeze({ id: '100g', weight: '100 g', name: 'Gói làm quen', description: 'Một gói nhỏ để thử vị trà sao củi.', tag: 'BẮT ĐẦU THẬT NHẸ', visual: 'visual-light', photoId: 'dry-tea', caption: 'Một chút trà, nhiều an yên.', suggestion: 'Phù hợp khi bạn muốn thử trà trước khi chọn gói lớn.' }),
  Object.freeze({ id: '250g', weight: '250 g', name: 'Gói mỗi ngày', description: 'Cho góc trà quen và những phút nghỉ ngơi.', tag: 'CHO NHỮNG NGÀY THƯỜNG', visual: 'visual-green', photoId: 'tea-tray', caption: 'Dành một khoảng bình yên mỗi ngày.', suggestion: 'Một lựa chọn gợi ý cho thói quen thưởng trà mỗi ngày.' }),
  Object.freeze({ id: '500g', weight: '500 g', name: 'Gói sẻ chia', description: 'Mời người thân, cùng bạn bè thưởng trà.', tag: 'NGON HƠN KHI CÙNG NHAU', visual: 'visual-warm', photoId: 'tea-pot', caption: 'Ấm trà đầy, câu chuyện dài thêm.', suggestion: 'Gợi ý khi bạn muốn cùng người thân hoặc bạn bè thưởng trà.' })
]);

export const teaPhotos = Object.freeze([
  Object.freeze({ id: 'dry-tea', src: 'assets/images (7).jpeg', width: 554, height: 554, alt: 'Trà khô, trà đã pha và chén nước trà trên bàn', caption: 'Trà khô và chén trà · Ảnh tham khảo do cửa hàng cung cấp.' }),
  Object.freeze({ id: 'tea-tray', src: 'assets/images (3).jpeg', width: 638, height: 480, alt: 'Mâm trà với lá chè xanh, trà khô và chén trà vàng', caption: 'Mâm trà và lá chè · Ảnh tham khảo, giữ nguyên dấu nguồn.' }),
  Object.freeze({ id: 'tea-pot', src: 'assets/images (6).jpeg', width: 547, height: 365, alt: 'Ấm trà màu đen bên chén trà và bát trà khô', caption: 'Một góc thưởng trà · Ảnh tham khảo do cửa hàng cung cấp.' }),
  Object.freeze({ id: 'tea-pack', src: 'assets/images (4).jpeg', width: 554, height: 554, alt: 'Gói trà màu vàng cạnh bát trà khô', caption: 'Ảnh bao bì tham khảo · Không xác định khối lượng; cần hỏi bao bì đang bán.' }),
  Object.freeze({ id: 'garden-cup', src: 'assets/images (11).jpeg', width: 638, height: 480, alt: 'Chén trà được cầm trên tay giữa vườn chè xanh', caption: 'Chén trà giữa vườn chè · Ảnh tham khảo, giữ nguyên dấu nguồn.' }),
  Object.freeze({ id: 'tea-table', src: 'assets/images (10).jpeg', width: 678, height: 452, alt: 'Bộ ấm trà đen và ba chén trà trên bàn gỗ', caption: 'Ấm trà và những chén trà · Ảnh tham khảo do cửa hàng cung cấp.' })
]);

export const editorialPhotos = Object.freeze([
  Object.freeze({ src: 'assets/doi-che-thai-nguyen-1.jpg', width: 1024, height: 683, alt: 'Người hái chè giữa những luống chè xanh', caption: 'Một góc mùa hái chè', description: 'Những lá trà bắt đầu từ sắc xanh của đồi chè.' }),
  Object.freeze({ src: 'assets/images (8).jpeg', width: 500, height: 329, alt: 'Giỏ đựng búp chè tươi giữa vườn chè', caption: 'Mộc mạc từ búp chè', description: 'Một góc nhìn gần hơn về những búp chè xanh.' }),
  Object.freeze({ src: 'assets/doi-che-thai-nguyen.jpg', width: 600, height: 399, alt: 'Các luống chè uốn cong theo sườn đồi', caption: 'Sắc xanh trên đồi chè', description: 'Những luống chè và vẻ bình yên của vùng trà.' })
]);

export function getPackage(id) {
  return packages.find(item => item.id === id);
}

export function getTeaPhoto(id) {
  return teaPhotos.find(photo => photo.id === id);
}

export function buildOrderMessage(weight, quantity, note = '') {
  if (!packages.some(item => item.weight === weight)) throw new Error('Gói trà không hợp lệ.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Vui lòng chọn từ 1 đến 100 gói, với số lượng nguyên.');
  if (typeof note !== 'string' || note.length > 500) throw new Error('Lời nhắn không được quá 500 ký tự.');
  const trimmedNote = note.trim();
  return `Chào Mộc Trà, mình muốn đặt trà xanh Thái Nguyên sao củi.\nGói trà muốn hỏi: ${weight}\nSố lượng: ${quantity} gói\nNhờ bạn xác nhận giá, quy cách đang bán, phí giao hàng và cách thanh toán trước khi chốt đơn.${trimmedNote ? `\nLời nhắn: ${trimmedNote}` : ''}`;
}

export function renderProductVisual(item, photo = getTeaPhoto(item.photoId), loading = 'lazy') {
  if (!photo) throw new Error('Không tìm thấy ảnh cho gói trà.');
  return `<div class="product-visual photo-visual ${item.visual}">
    <span class="product-tag">${item.tag}</span>
    <img class="product-photo" src="${encodeURI(photo.src)}" alt="${photo.alt}" width="${photo.width}" height="${photo.height}" loading="${loading}" decoding="async">
    <span class="visual-caption">${item.caption}</span>
  </div>`;
}

export function renderProductGallery(item) {
  const selectedPhoto = getTeaPhoto(item.photoId);
  if (!selectedPhoto) throw new Error('Không tìm thấy ảnh cho thư viện trà.');
  return `<div id="detail-visual">${renderProductVisual(item, selectedPhoto, 'eager')}</div>
    <div class="gallery-thumbnails" role="group" aria-label="Chọn ảnh về trà">${teaPhotos.map(photo => `<button class="gallery-thumb" type="button" data-photo="${photo.id}" aria-label="Xem ảnh: ${photo.alt}" aria-pressed="${photo.id === selectedPhoto.id}"><img src="${encodeURI(photo.src)}" alt="" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async"></button>`).join('')}</div>
    <p id="gallery-caption" class="illustration-note" aria-live="polite">${selectedPhoto.caption}</p>
    <p class="gallery-disclaimer">Ảnh không xác định quy cách 100/250/500 g. Hỏi cửa hàng để xác nhận bao bì và sản phẩm đang bán.</p>`;
}

export function renderProductCard(item) {
  return `<article class="product-card" data-product-id="${item.id}">
    <a class="product-image-link" href="chi-tiet-tra.html?goi=${item.id}" aria-label="Xem trà xanh Thái Nguyên ${item.weight}">${renderProductVisual(item)}</a>
    <div class="product-info">
      <div class="product-title"><h3><a href="chi-tiet-tra.html?goi=${item.id}">${item.name}</a></h3><span>${item.weight}</span></div>
      <p>${item.description}</p>
      <div class="product-bottom"><span class="price-label">Liên hệ báo giá</span><button class="product-button" data-package="${item.weight}" aria-label="Đặt trà ${item.weight} qua Zalo">Đặt qua Zalo <span aria-hidden="true">↗</span></button></div>
      <a class="product-detail-link" href="chi-tiet-tra.html?goi=${item.id}">Xem chi tiết gói trà <span aria-hidden="true">→</span></a>
    </div>
  </article>`;
}

export function renderHeader() {
  return `<a class="brand" href="index.html" aria-label="Mộc Trà — Trang chủ"><img src="assets/leaf.svg" alt="" width="34" height="34"><span>Mộc Trà<span class="brand-dot">.</span></span></a>
    <nav class="desktop-nav" aria-label="Điều hướng chính"><a href="index.html#cau-chuyen">Câu chuyện</a><a href="san-pham.html">Sản phẩm</a><a href="mua-hang.html">Mua hàng</a><a href="lien-he.html">Liên hệ</a></nav>
    <a class="button button-small" href="san-pham.html">Chọn trà <span aria-hidden="true">↗</span></a>
    <button class="menu-toggle" aria-label="Mở menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span></button>
    <nav class="mobile-nav" id="mobile-nav" aria-label="Điều hướng điện thoại" hidden><a href="index.html">Trang chủ</a><a href="index.html#cau-chuyen">Câu chuyện</a><a href="san-pham.html">Sản phẩm</a><a href="mua-hang.html">Mua hàng</a><a href="lien-he.html">Liên hệ</a></nav>`;
}

export function renderFooter() {
  return `<div><a class="brand" href="index.html" aria-label="Mộc Trà — Trang chủ"><img src="assets/leaf.svg" alt="" width="30" height="30"><span>Mộc Trà.</span></a><p>Trà mộc. Tâm lành. Giá gần gũi.</p><a class="footer-phone" href="${shop.phoneUrl}">${shop.displayPhone}</a></div>
    <div class="footer-links"><a href="san-pham.html">Sản phẩm</a><a href="mua-hang.html">Thông tin mua hàng</a><a href="mua-hang.html#bao-mat">Quyền riêng tư</a><a href="lien-he.html">Liên hệ</a><a href="${shop.zaloUrl}" target="_blank" rel="noopener noreferrer">Zalo ↗</a></div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} Mộc Trà · Trà xanh Thái Nguyên</span><span class="demo-note">Tên thương hiệu tạm · Ảnh tham khảo · Quy cách cần xác nhận</span></div>`;
}

export function renderOrderDialog() {
  return `<dialog id="order-dialog" aria-labelledby="order-title">
    <button class="dialog-close" aria-label="Đóng cửa sổ">×</button>
    <span class="eyebrow">ĐẶT TRÀ QUA ZALO</span><h2 id="order-title">Chọn trà <em>cho bạn.</em></h2>
    <p class="dialog-intro">Chọn gói, sao chép lời nhắn rồi gửi cho cửa hàng qua Zalo.</p>
    <form id="order-form">
      <label for="package">Gói trà muốn hỏi</label><select id="package" name="package">${packages.map(item => `<option value="${item.weight}">${item.name} · ${item.weight}</option>`).join('')}</select>
      <label for="quantity">Số lượng gói</label><input id="quantity" name="quantity" type="number" min="1" max="100" step="1" value="1" required>
      <label for="order-note">Lời nhắn thêm <span>(không bắt buộc)</span></label><textarea id="order-note" name="note" maxlength="500" rows="2" placeholder="Ví dụ: Mình thích vị trà đậm, nhờ tư vấn giúp."></textarea>
      <div class="contact-notice">Giá, quy cách và phí giao hàng sẽ được xác nhận qua Zalo ${shop.displayPhone}. Website chưa gửi hay xác nhận đơn tự động.</div>
      <p id="order-error" class="form-error" role="alert" hidden></p>
      <button class="button form-submit" type="submit">Soạn lời nhắn đặt trà <span aria-hidden="true">↗</span></button>
    </form>
    <div id="request-result" hidden><label for="request-message">Lời nhắn của bạn</label><textarea id="request-message" readonly rows="6"></textarea><button class="button button-outline" id="copy-message" type="button">1. Sao chép lời nhắn</button><a class="button zalo-order-link" href="${shop.zaloUrl}" target="_blank" rel="noopener noreferrer">2. Mở Zalo và gửi <span aria-hidden="true">↗</span></a><p class="dialog-help">Zalo không tự điền lời nhắn: hãy dán và gửi trong cuộc trò chuyện. Đơn chỉ được chốt khi cửa hàng xác nhận.</p><p id="copy-status" role="status" aria-live="polite"></p></div>
  </dialog>`;
}
