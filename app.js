import { shop, packages, editorialPhotos, getPackage, getTeaPhoto, buildOrderMessage, renderProductVisual, renderProductGallery, renderProductCard, renderHeader, renderFooter, renderOrderDialog } from './shop.js';

document.querySelector('[data-site-header]').innerHTML = renderHeader();
document.querySelector('[data-site-footer]').innerHTML = renderFooter();
document.body.insertAdjacentHTML('beforeend', renderOrderDialog());

const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.desktop-nav a, .mobile-nav a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  if (currentPage === 'chi-tiet-tra.html' && link.getAttribute('href') === 'san-pham.html') link.setAttribute('aria-current', 'location');
});
document.querySelectorAll('[data-zalo-link]').forEach(link => { link.href = shop.zaloUrl; });
document.querySelectorAll('[data-phone-link]').forEach(link => { link.href = shop.phoneUrl; });
document.querySelectorAll('[data-contact-phone]').forEach(element => { element.textContent = shop.displayPhone; });
document.querySelectorAll('[data-product-grid]').forEach(grid => { grid.innerHTML = packages.map(renderProductCard).join(''); });
document.querySelectorAll('[data-tea-photo-grid]').forEach(grid => {
  grid.innerHTML = editorialPhotos.map(photo => `<figure class="tea-photo-card"><img src="${encodeURI(photo.src)}" alt="${photo.alt}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async"><figcaption><h3>${photo.caption}</h3><p>${photo.description}</p></figcaption></figure>`).join('');
});

const dialog = document.querySelector('#order-dialog');
const form = document.querySelector('#order-form');
const packageSelect = document.querySelector('#package');
const result = document.querySelector('#request-result');
const messageField = document.querySelector('#request-message');
const copyStatus = document.querySelector('#copy-status');
const copyButton = document.querySelector('#copy-message');
const orderError = document.querySelector('#order-error');
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');

function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Mở menu');
  mobileNav.hidden = true;
}

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Mở menu' : 'Đóng menu');
  mobileNav.hidden = isOpen;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (dialog.open) {
    dialog.close();
  } else if (!mobileNav.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
matchMedia('(min-width: 701px)').addEventListener('change', closeMenu);

function openOrder(weight, quantity = 1) {
  buildOrderMessage(weight, quantity);
  form.reset();
  packageSelect.value = weight;
  form.elements.quantity.value = String(quantity);
  result.hidden = true;
  orderError.hidden = true;
  copyStatus.textContent = '';
  messageField.value = '';
  dialog.showModal();
  document.body.classList.add('dialog-open');
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-package]');
  if (button) openOrder(button.dataset.package);
});

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});

form.addEventListener('input', () => {
  result.hidden = true;
  copyStatus.textContent = '';
  orderError.hidden = true;
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  try {
    messageField.value = buildOrderMessage(packageSelect.value, Number(form.elements.quantity.value), form.elements.note.value);
    result.hidden = false;
    orderError.hidden = true;
    copyStatus.textContent = 'Lời nhắn đã sẵn sàng. Sao chép rồi mở Zalo để gửi cho cửa hàng.';
    messageField.focus();
  } catch (error) {
    console.error('Không thể soạn lời nhắn đặt trà:', error);
    result.hidden = true;
    orderError.textContent = error.message;
    orderError.hidden = false;
  }
});

copyButton.addEventListener('click', async () => {
  copyButton.disabled = true;
  try {
    if (!navigator.clipboard) throw new Error('Trình duyệt không hỗ trợ sao chép tự động.');
    await navigator.clipboard.writeText(messageField.value);
    copyStatus.textContent = 'Đã sao chép. Mở Zalo, dán lời nhắn và bấm gửi. Cửa hàng sẽ xác nhận đơn với bạn.';
  } catch (error) {
    console.error('Không thể sao chép lời nhắn:', error);
    copyStatus.textContent = 'Không thể tự động sao chép. Hãy sao chép lời nhắn đã chọn bằng Ctrl+C hoặc ⌘C; trên điện thoại, chạm giữ và chọn Sao chép.';
    messageField.focus();
    messageField.select();
  } finally {
    copyButton.disabled = false;
  }
});

const filters = document.querySelector('[data-product-filters]');
if (filters) {
  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let count = 0;
    document.querySelectorAll('[data-product-id]').forEach(card => {
      card.hidden = button.dataset.filter !== 'all' && card.dataset.productId !== button.dataset.filter;
      if (!card.hidden) count += 1;
    });
    document.querySelector('#product-count').textContent = `${count} quy cách gợi ý`;
  });
}

const productDetail = document.querySelector('[data-product-detail]');
if (productDetail) {
  const requestedId = new URLSearchParams(location.search).get('goi') ?? '250g';
  const selectedPackage = getPackage(requestedId);
  if (!selectedPackage) {
    console.error('Không tìm thấy gói trà:', requestedId);
    document.title = 'Không tìm thấy gói trà — Mộc Trà';
    productDetail.innerHTML = '<div class="empty-state"><span class="eyebrow">GÓI TRÀ KHÔNG TỒN TẠI</span><h1 class="page-title">Mình chưa tìm thấy<br><em>gói trà này.</em></h1><p>Đường dẫn có thể không còn đúng. Hãy chọn một gói trong danh mục hoặc nhắn Zalo để được tư vấn.</p><a class="button" href="san-pham.html">Xem các gói trà <span aria-hidden="true">↗</span></a></div>';
  } else {
    productDetail.innerHTML = `<div class="product-detail-layout">
      <div class="detail-gallery">${renderProductGallery(selectedPackage)}</div>
      <div class="detail-copy"><span class="eyebrow">TRÀ SẠCH · SAO CỦI · SÀNG KỸ</span><h1 class="page-title">Trà xanh<br><em>Thái Nguyên.</em></h1><p class="detail-lead">Giữ nét mộc của trà xanh, chăm chút từng mẻ sao củi và sàng lọc kỹ để giảm vụn.</p>
      <div class="detail-price"><strong>Liên hệ báo giá</strong><span>Giá theo quy cách và số lượng, chưa gồm phí giao hàng.</span></div>
      <form id="product-order-form"><fieldset class="variant-options"><legend>Chọn lượng trà muốn hỏi</legend>${packages.map(item => `<label><input type="radio" name="variant" value="${item.id}" ${item.id === selectedPackage.id ? 'checked' : ''}><span>${item.weight}</span></label>`).join('')}</fieldset>
      <p id="variant-suggestion">${selectedPackage.suggestion}</p>
      <label class="detail-quantity-label" for="detail-quantity">Số lượng gói</label><div class="quantity-picker"><button type="button" data-quantity-step="-1" aria-label="Giảm số lượng">−</button><input id="detail-quantity" name="quantity" type="number" value="1" min="1" max="100" step="1" required><button type="button" data-quantity-step="1" aria-label="Tăng số lượng">+</button></div>
      <p id="detail-error" class="form-error" role="alert" hidden></p>
      <button class="button detail-order" type="submit">Đặt trà qua Zalo <span aria-hidden="true">↗</span></button></form>
      <a class="detail-phone" href="${shop.phoneUrl}">Hoặc gọi ${shop.displayPhone} để hỏi về trà</a>
      <p class="detail-disclaimer">Các mức 100/250/500 g là quy cách gợi ý, cần cửa hàng xác nhận. Không thanh toán hoặc tự động chốt đơn trên website.</p>
      <div class="detail-benefits"><span>✓ Sao củi</span><span>✓ Sàng kỹ, ít vụn</span><span>✓ Giá gần gũi</span></div></div></div>`;

    const detailForm = document.querySelector('#product-order-form');
    const quantity = document.querySelector('#detail-quantity');
    const detailError = document.querySelector('#detail-error');
    const gallery = document.querySelector('.detail-gallery');
    const showPhoto = (item, photo) => {
      document.querySelector('#detail-visual').innerHTML = renderProductVisual(item, photo, 'eager');
      document.querySelector('#gallery-caption').textContent = photo.caption;
      gallery.querySelectorAll('[data-photo]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.photo === photo.id));
      });
    };
    gallery.addEventListener('click', event => {
      const button = event.target.closest('[data-photo]');
      if (!button) return;
      const photo = getTeaPhoto(button.dataset.photo);
      if (!photo) {
        console.error('Không tìm thấy ảnh trà:', button.dataset.photo);
        document.querySelector('#gallery-caption').textContent = 'Không tìm thấy ảnh này. Vui lòng chọn ảnh khác hoặc tải lại trang.';
        return;
      }
      showPhoto(getPackage(detailForm.elements.variant.value), photo);
    });
    const updateQuantityButtons = () => {
      const value = Number(quantity.value);
      detailForm.querySelector('[data-quantity-step="-1"]').disabled = quantity.validity.valid && value === 1;
      detailForm.querySelector('[data-quantity-step="1"]').disabled = quantity.validity.valid && value === 100;
    };
    const updateVariant = () => {
      const item = getPackage(detailForm.elements.variant.value);
      showPhoto(item, getTeaPhoto(item.photoId));
      document.querySelector('#variant-suggestion').textContent = item.suggestion;
      document.title = `Trà xanh Thái Nguyên ${item.weight} — Mộc Trà`;
      document.querySelector('meta[name="description"]').content = `Trà xanh Thái Nguyên sao củi, sàng kỹ ít vụn. Tìm hiểu gói ${item.weight} và liên hệ Zalo ${shop.displayPhone} để nhận giá.`;
      const url = new URL(location.href);
      url.searchParams.set('goi', item.id);
      history.replaceState(null, '', url);
    };
    updateVariant();
    updateQuantityButtons();
    detailForm.addEventListener('change', event => {
      if (event.target.name === 'variant') updateVariant();
    });
    detailForm.addEventListener('click', event => {
      const button = event.target.closest('[data-quantity-step]');
      if (!button) return;
      if (!quantity.reportValidity()) return;
      const next = Number(quantity.value) + Number(button.dataset.quantityStep);
      if (next >= 1 && next <= 100) quantity.value = String(next);
      updateQuantityButtons();
    });
    detailForm.addEventListener('input', () => {
      detailError.hidden = true;
      updateQuantityButtons();
    });
    detailForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!detailForm.reportValidity()) return;
      try {
        openOrder(getPackage(detailForm.elements.variant.value).weight, Number(quantity.value));
      } catch (error) {
        console.error('Không thể chọn gói trà:', error);
        detailError.textContent = error.message;
        detailError.hidden = false;
      }
    });
  }
}
