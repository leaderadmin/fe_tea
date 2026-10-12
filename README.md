# Mộc Trà

Landing page tiếng Việt cho trà xanh Thái Nguyên: trà sạch, sao củi, sàng kỹ ít vụn và định hướng giá gần gũi. Hero giữ hình phong cảnh và mây từ Fieldhand theo xác nhận quyền sử dụng của chủ dự án, thay tiêu đề thành nội dung trà. Các phần sản phẩm và câu chuyện dùng ảnh do chủ dự án bổ sung.

Bảng màu lấy cảm hứng từ Fieldhand: nền trắng `#ffffff`, chữ gần đen `#14170f`, xanh olive `#4a5d0e`, điểm nhấn tím lavender và hồng đào pastel trong phong cảnh. Các màu giao diện chính được quản lý bằng biến CSS trong `styles.css`; màu minh họa nằm trong các SVG tại `assets`.

Hero sử dụng phông Instrument Sans, phong cảnh núi–hồ, mây hai bên, chim và ô kính trang trí. Hai ảnh gốc được lưu tại `assets/fieldhand-landscape.jpg` và `assets/fieldhand-cloud.jpg`, nguồn lần lượt là `https://fieldhand-template.modulify.website/images/hero-landscape.jpg` và `https://fieldhand-template.modulify.website/images/cloud.jpg`. Quyền sử dụng do chủ dự án xác nhận; cần giữ giấy phép phù hợp khi triển khai. Hình núi–hồ là trang trí, không phải ảnh vùng chè Thái Nguyên.

## Chạy tại máy

Yêu cầu Node.js 18 trở lên. Không cần cài thư viện.

Repository: https://github.com/leaderadmin/fe_tea

```sh
git clone https://github.com/leaderadmin/fe_tea.git
cd fe_tea
```

```sh
npm start
```

Mở http://127.0.0.1:3000. Đổi cổng bằng `PORT=3001 npm start`.

```sh
npm run check
npm test
npm run build:pages
```

Có thể đưa các tệp HTML, `styles.css`, `shop.css`, `app.js`, `shop.js` và thư mục `assets` lên dịch vụ hosting tĩnh. `npm run build:pages` tạo thư mục `_site` chỉ gồm tài nguyên cần triển khai lên GitHub Pages. `server.mjs` chỉ là máy chủ xem thử tại máy, chỉ lắng nghe trên loopback. JavaScript dùng ES modules, nên mở bằng máy chủ HTTP thay vì `file://`.

Website công khai tại https://leaderadmin.github.io/fe_tea/ khi GitHub Pages được bật cho repository. Mỗi lần push lên `main`, GitHub Actions tự build và deploy. Để kích hoạt lần đầu, chủ repository cần mở **Settings → Pages → Build and deployment → Source: GitHub Actions**; repository hiện chưa bật Pages và chỉ chủ repository mới có quyền thay đổi thiết lập đó.

## Các trang và đặt trà

- `index.html`: landing page, giữ nguyên hero đã duyệt; có gói trà nổi bật và hướng dẫn đặt qua Zalo.
- `san-pham.html`: danh mục với bộ lọc quy cách.
- `chi-tiet-tra.html?goi=250g`: chi tiết trà, chọn quy cách, số lượng, cách pha và bảo quản. Hỗ trợ `100g`, `250g`, `500g`; mã không tồn tại hiển thị lỗi rõ ràng.
- `lien-he.html`: Zalo và điện thoại **0344 789 803**, theo số chủ cửa hàng cung cấp.
- `mua-hang.html`: cách mua, thông tin cần xác nhận về giao hàng, thanh toán, hỗ trợ sau mua và quyền riêng tư; không tự đặt chính sách chưa được chủ cửa hàng xác nhận.

`shop.js` là nguồn chung cho các gói trà, số liên hệ, thẻ sản phẩm, menu, footer và cửa sổ đặt trà. Các trang dùng chung `app.js` và `shop.css`. Biểu mẫu tạo lời nhắn gồm gói trà, số lượng và ghi chú, cho phép sao chép rồi mở `https://zalo.me/0344789803`. Zalo không tự nhận nội dung từ website: khách phải dán và gửi; đơn được chốt trong cuộc trò chuyện. Chưa có backend, giỏ hàng hoặc thanh toán online, phù hợp luồng bán hàng qua Zalo đã chọn.

## Ảnh do chủ dự án cung cấp

- `teaPhotos` trong `shop.js` cấu hình ảnh trà, bộ ấm và bao bì tham khảo. `packages[].photoId` chọn ảnh mặc định cho từng thẻ sản phẩm.
- Trang chi tiết có sáu ảnh thu nhỏ; chọn ảnh thay hình lớn và chú thích, không làm thay đổi gói trà hoặc số lượng. Đổi quy cách chọn lại ảnh mặc định tương ứng.
- `editorialPhotos` cấu hình ảnh đồi chè và búp chè ở trang chủ. Phần câu chuyện dùng `assets/images (10).jpeg`. Hero Fieldhand không thay đổi.
- Chủ dự án xác nhận có quyền sử dụng toàn bộ ảnh đã thêm, kể cả ảnh mang watermark. Giữ nguyên tệp gốc và watermark; ảnh dùng `object-fit: contain` để không cắt mất dấu nguồn. Cần giữ giấy phép/quyền sử dụng khi triển khai.
- Ảnh là tham khảo, không chứng minh xuất xứ, mẻ trà, thương hiệu hay khối lượng đang bán. Không gán khối lượng cho gói trà màu vàng trong ảnh khi chưa được xác nhận. Không dùng những ảnh 192 px làm ảnh sản phẩm lớn.
- Máy chủ xem thử hỗ trợ `.jpg` và `.jpeg`, kể cả tên có dấu cách. Tệp `assets/imgres.html` tải kèm không được đưa vào website hoặc phục vụ công khai.

Chưa kiểm chứng tài khoản Zalo bên ngoài có nhận tin nhắn hay không; việc xác nhận và xử lý đơn cần kiểm tra bằng tài khoản Zalo thực tế. Website không tự gửi tin trong quá trình kiểm thử.

## Thông tin cần xác nhận trước khi công khai

- **Mộc Trà** là tên thương hiệu tạm. Đổi trong các trang HTML, `shop.js`, `server.mjs` và metadata theo tên thực tế.
- Các gói **100 g, 250 g, 500 g** là quy cách gợi ý. Cập nhật `packages` trong `shop.js` và chú thích trong các trang theo quy cách bán thực tế.
- Đã có số Zalo và điện thoại do chủ cửa hàng cung cấp. Chưa có giá thật, địa chỉ, giờ mở cửa, chính sách giao hàng/thanh toán/đổi trả. Không có giá giả, chứng nhận, đánh giá khách hàng hay số liệu giảm giá được tự tạo.
- Nội dung “trà sạch”, “sao củi”, “sàng kỹ ít vụn”, “giá rẻ hơn thị trường” dựa trên mô tả của chủ cửa hàng, không phải kết quả kiểm định. Xác minh tuyên bố và thông tin giá trước khi quảng cáo.
- Biểu mẫu **chỉ soạn và sao chép lời nhắn**, không tự gửi yêu cầu, không lưu dữ liệu, không thanh toán hay xác nhận đơn. Mở Zalo là bước tiếp theo để khách gửi thủ công; không thông báo thành công đặt hàng trên website.
- Đã đưa ảnh được cung cấp vào giao diện; vẫn cần xác nhận ảnh nào đúng với sản phẩm/bao bì đang bán trước khi quảng cáo là ảnh sản phẩm thực tế.

Phông chữ Google Fonts được tải trực tuyến; trang có phông dự phòng khi ngoại tuyến. Các tài nguyên hình ảnh nằm tại máy. Giao diện hỗ trợ điện thoại, bàn phím, cửa sổ hội thoại và tùy chọn giảm chuyển động.
