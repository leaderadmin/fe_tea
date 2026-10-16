<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Faq;
use App\Models\Media;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Page;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class CmsContentSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedPermissions();
        $this->seedSiteContent();
    }

    private function seedPermissions(): void
    {
        $features = [
            'dashboard' => ['view'],
            'posts' => ['view', 'create', 'update', 'delete', 'submit', 'approve'],
            'products' => ['view', 'create', 'update', 'delete', 'submit', 'approve'],
            'pages' => ['view', 'create', 'update', 'delete', 'submit', 'approve'],
            'menus' => ['view', 'create', 'update', 'delete', 'submit', 'approve'],
            'menu_items' => ['view', 'create', 'update', 'delete', 'submit', 'approve'],
            'faqs' => ['view', 'create', 'update', 'delete', 'submit', 'approve'],
            'settings' => ['view', 'update', 'submit', 'approve'],
            'media' => ['view', 'upload', 'update', 'delete'],
            'categories' => ['view', 'manage'],
            'users' => ['view', 'manage'],
            'roles' => ['view', 'manage'],
            'revisions' => ['view', 'review'],
        ];

        $allPermissions = [];
        $editorPermissions = ['dashboard.view', 'media.view', 'media.upload', 'categories.view', 'revisions.view'];

        foreach ($features as $feature => $actions) {
            foreach ($actions as $action) {
                $permission = Permission::firstOrCreate(['name' => "{$feature}.{$action}", 'guard_name' => 'web']);
                $allPermissions[] = $permission;
            }
        }

        foreach (['posts', 'products', 'pages', 'menus', 'menu_items', 'faqs', 'settings'] as $feature) {
            foreach (['view', 'update', 'submit'] as $action) {
                $editorPermissions[] = "{$feature}.{$action}";
            }
            if ($feature !== 'settings') {
                $editorPermissions[] = "{$feature}.create";
            }
        }

        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions($allPermissions);
        $editor = Role::firstOrCreate(['name' => 'editor', 'guard_name' => 'web']);
        if ($editor->wasRecentlyCreated) {
            $editor->syncPermissions(array_values(array_unique($editorPermissions)));
        }
    }

    private function seedSiteContent(): void
    {
        $category = Category::query()->where('type', 'product')->first()
            ?? Category::create([
                'type' => 'product',
                'slug' => 'tra-xanh-thai-nguyen',
                'name' => 'Trà xanh Thái Nguyên',
                'description' => 'Danh mục trà xanh Thái Nguyên.',
            ]);

        $brand = [
            'name' => 'Mộc Trà',
            'tagline' => 'Trà mộc. Tâm lành. Giá gần gũi.',
            'phone' => '0344789803',
            'display_phone' => '0344 789 803',
            'phone_url' => 'tel:+84344789803',
            'zalo_url' => 'https://zalo.me/0344789803',
            'logo_url' => '/assets/leaf.svg',
        ];
        $this->publishSetting('brand', $brand);
        $this->publishSetting('contact', [
            'phone' => $brand['phone'],
            'display_phone' => $brand['display_phone'],
            'phone_url' => $brand['phone_url'],
            'zalo_url' => $brand['zalo_url'],
            'email' => '',
            'address' => '',
            'business_hours' => '',
        ]);
        $this->publishSetting('seo', [
            'default_title' => 'Trà xanh Thái Nguyên sao củi',
            'title_suffix' => '— Mộc Trà',
            'default_description' => 'Trà xanh Thái Nguyên sao củi, sàng lọc kỹ càng, ít vụn. Hỏi giá và đặt trà qua Zalo.',
        ]);
        $this->publishSetting('social', [
            'facebook_url' => '',
            'instagram_url' => '',
            'tiktok_url' => '',
            'youtube_url' => '',
        ]);
        $this->publishSetting('theme', [
            'primary_color' => '#4a5d0e',
            'accent_color' => '#394909',
            'background_color' => '#ffffff',
            'surface_color' => '#f8f9f5',
            'text_color' => '#14170f',
        ]);

        $homeContent = [
            'hero' => [
                'eyebrow' => '',
                'title' => 'Trà xanh Thái Nguyên.',
                'subtitle' => 'Sao củi, trọn vị mộc.',
                'emphasis' => 'trọn vị mộc.',
                'landscape' => '/assets/fieldhand-landscape.jpg',
                'cloud' => '/assets/fieldhand-cloud.jpg',
            ],
            'promises' => [
                'eyebrow' => 'KHÔNG CẦU KỲ. CHỈ THẬT TÂM.',
                'title' => 'Trà ngon bắt đầu từ những điều tử tế.',
                'items' => [
                    ['title' => 'Trà sạch', 'body' => 'Chọn vị trà nguyên bản cho chén trà uống mỗi ngày.'],
                    ['title' => 'Sao bằng củi', 'body' => 'Lửa củi và sự chăm chút làm nên nét riêng của từng mẻ trà.'],
                    ['title' => 'Sàng kỹ, ít vụn', 'body' => 'Lọc kỹ sau khi sao, để mỗi gói trà đều chỉn chu hơn.'],
                ],
            ],
            'story' => [
                'eyebrow' => 'CHUYỆN CỦA LÁ TRÀ',
                'title' => 'Chậm một chút. Để vị trà ở lại lâu hơn.',
                'body' => 'Có những điều không cần làm mới. Như cách sao trà bằng củi, cách sàng lọc kỹ từng mẻ, hay thói quen ngồi xuống bên một ấm trà xanh.',
                'body2' => 'Chúng mình chọn giữ những điều giản dị ấy trong trà Thái Nguyên: sạch, ít vụn và vừa túi tiền. Để một chén trà ngon không phải là điều xa xỉ.',
                'link_label' => 'Xem cách chúng mình làm trà',
                'image' => '/assets/images (10).jpeg',
                'image_alt' => 'Bộ ấm trà đen và ba chén trà trên bàn gỗ',
            ],
            'gallery' => [
                'eyebrow' => 'NHỮNG GÓC NHÌN VỀ TRÀ',
                'title' => 'Từ sắc xanh của lá.',
                'title_emphasis' => 'Đến khoảng lặng bên trà.',
                'summary' => 'Ảnh tham khảo do cửa hàng cung cấp. Một vài góc nhìn về lá trà và đồi chè.',
                'photos' => [
                    ['src' => '/assets/doi-che-thai-nguyen-1.jpg', 'alt' => 'Người hái chè giữa những luống chè xanh', 'caption' => 'Một góc mùa hái chè', 'description' => 'Những lá trà bắt đầu từ sắc xanh của đồi chè.'],
                    ['src' => '/assets/images (8).jpeg', 'alt' => 'Giỏ đựng búp chè tươi giữa vườn chè', 'caption' => 'Mộc mạc từ búp chè', 'description' => 'Một góc nhìn gần hơn về những búp chè xanh.'],
                    ['src' => '/assets/doi-che-thai-nguyen.jpg', 'alt' => 'Các luống chè uốn cong theo sườn đồi', 'caption' => 'Sắc xanh trên đồi chè', 'description' => 'Những luống chè và vẻ bình yên của vùng trà.'],
                ],
            ],
            'product_section' => [
                'eyebrow' => 'TRÀ CỦA CHÚNG MÌNH',
                'title' => 'Một vị trà mộc.',
                'title_emphasis' => 'Nhiều cách thưởng thức.',
                'link_label' => 'Xem trang sản phẩm',
                'disclaimer' => 'Ảnh tham khảo do cửa hàng cung cấp. Quy cách và bao bì đang bán được xác nhận khi tư vấn.',
                'price_title' => 'Trà ngon, giá gần gũi.',
                'price_text' => 'Định hướng giá rẻ hơn thị trường — nhắn để nhận giá theo gói và số lượng.',
            ],
            'faq_section' => [
                'eyebrow' => 'BẠN CÓ THỂ ĐANG THẮC MẮC',
                'title' => 'Chuyện trà,',
                'title_emphasis' => 'mình kể bạn nghe.',
                'intro' => 'Một vài điều nhỏ trước khi chọn trà.',
            ],
            'order_guide' => [
                'eyebrow' => 'CHỌN TRÀ, NHẮN MỘT LỜI',
                'title' => 'Đặt trà qua Zalo. Thật gần, thật dễ.',
                'steps' => [
                    ['title' => 'Chọn gói trà', 'body' => 'Xem chi tiết, chọn lượng trà và số gói muốn hỏi.'],
                    ['title' => 'Soạn & sao chép', 'body' => 'Chuẩn bị lời nhắn từ lựa chọn của bạn.'],
                    ['title' => 'Gửi qua Zalo', 'body' => 'Mở Zalo để dán lời nhắn và gửi cửa hàng xác nhận.'],
                ],
            ],
            'process' => [
                'eyebrow' => 'TỪ LÁ TRÀ ĐẾN CHÉN TRÀ',
                'title' => 'Chăm chút từng bước. Trọn vẹn từng ngụm.',
                'items' => [
                    ['title' => 'Chọn lá trà', 'body' => 'Bắt đầu với trà xanh Thái Nguyên.'],
                    ['title' => 'Sao trên lửa củi', 'body' => 'Chăm chút mẻ sao theo phương pháp truyền thống.'],
                    ['title' => 'Sàng lọc kỹ càng', 'body' => 'Loại bớt vụn trà sau khi sao.'],
                    ['title' => 'Gói ghém gửi bạn', 'body' => 'Sẵn sàng cho những ấm trà và câu chuyện mới.'],
                ],
            ],
            'brewing' => [
                'eyebrow' => 'MỘT GỢI Ý NHỎ',
                'title' => 'Pha vừa tay. Uống vừa lòng.',
                'intro' => 'Không cần cầu kỳ. Bắt đầu từ một ấm trà nhỏ, rồi điều chỉnh theo vị bạn thích.',
                'steps' => [
                    ['title' => 'Làm ấm ấm và chén', 'body' => 'Tráng bằng nước nóng trước khi pha.'],
                    ['title' => 'Thêm trà, rót nước', 'body' => 'Thử 5 g trà với 150 ml nước khoảng 80–85°C.'],
                    ['title' => 'Đợi một chút, thưởng thức', 'body' => 'Hãm 30–60 giây, điều chỉnh theo khẩu vị.'],
                ],
            ],
            'closing' => [
                'eyebrow' => 'MỘT ẤM TRÀ. MỘT KHOẢNG THẢNH THƠI.',
                'title' => 'Để ngày dài dịu lại bên chén trà xanh.',
                'link_label' => 'Chọn một gói trà cho mình',
            ],
        ];
        if (! Page::query()->exists()) {
            $this->publishPage('home', 'Trang chủ', $homeContent);
            $this->publishPage('lien-he', 'Liên hệ', [
                'intro' => 'Bạn hỏi về trà. Chúng mình lắng nghe.',
                'body' => 'Hỏi giá, chọn lượng trà hoặc trao đổi về một gói trà đã mua. Liên hệ trực tiếp để được tư vấn và xác nhận thông tin.',
                'sections' => [
                    ['title' => 'Nhắn qua Zalo', 'body' => 'Chia sẻ khẩu vị và lượng trà muốn mua. Chúng mình sẽ trao đổi về giá và cách giao hàng.'],
                    ['title' => 'Gọi điện thoại', 'body' => 'Nếu bạn muốn hỏi trực tiếp hoặc chưa dùng Zalo, có thể gọi tới số liên hệ của cửa hàng. Thời gian phản hồi tùy thời điểm liên hệ.'],
                    ['title' => 'Trước khi nhắn', 'body' => "Bạn có thể chuẩn bị lượng trà và số gói muốn mua, khẩu vị trà nhẹ hay đậm, và khu vực nhận hàng để hỏi phí giao.\n\nChỉ gửi địa chỉ cụ thể khi đã trao đổi và cần xác nhận giao hàng."],
                    ['title' => 'Đến mua trực tiếp', 'body' => 'Địa chỉ cửa hàng và giờ mở cửa chưa được công bố trên website. Hãy nhắn hoặc gọi trước để xác nhận nơi nhận trà; không dùng hình phong cảnh trên trang làm địa chỉ cửa hàng.'],
                ],
            ]);
            $this->publishPage('mua-hang', 'Thông tin mua hàng', [
                'intro' => 'Mua trà giản dị. Trao đổi thật rõ.',
                'body' => 'Website giúp bạn chọn trà và soạn lời nhắn. Giá, giao hàng và đơn mua được xác nhận trực tiếp qua Zalo.',
                'sections' => [
                    ['title' => 'Đặt trà qua Zalo', 'body' => "1. Chọn gói tại [trang sản phẩm](/san-pham) hoặc trang chi tiết, nhập số lượng.\n2. Bấm “Đặt trà qua Zalo”, soạn và sao chép lời nhắn.\n3. Mở Zalo [0344 789 803](https://zalo.me/0344789803), dán lời nhắn và gửi.\n4. Trao đổi với cửa hàng để xác nhận sản phẩm, giá, giao hàng và cách thanh toán.\n\nMở Zalo hoặc sao chép lời nhắn chưa có nghĩa là đã đặt hàng. Website không tự gửi tin nhắn, giữ hàng hay xác nhận đơn."],
                    ['title' => 'Giá & giao hàng', 'body' => 'Hiện giá bán chưa được công bố trên website. Các mức 100/250/500 g là quy cách gợi ý; cần hỏi lại quy cách đang bán và giá theo số lượng. Phí giao, khu vực nhận hàng, đơn vị vận chuyển và thời gian dự kiến chưa có chính sách cố định được cung cấp. Hãy trao đổi khu vực nhận hàng để được báo thông tin trước khi chốt đơn. Không có cam kết miễn phí giao hàng hoặc thời gian giao cố định trên trang này.'],
                    ['title' => 'Thanh toán', 'body' => 'Website không nhận thanh toán, không yêu cầu thông tin thẻ và chưa kết nối cổng thanh toán. Phương thức thanh toán được trao đổi trực tiếp với cửa hàng qua kênh liên hệ đã công bố. Chỉ thanh toán sau khi kiểm tra thông tin người nhận, sản phẩm, số lượng và tổng chi phí với cửa hàng. Chưa có xác nhận hỗ trợ thu hộ COD hoặc tài khoản chuyển khoản trên website.'],
                    ['title' => 'Hỗ trợ sau mua', 'body' => 'Nếu gói trà gặp vấn đề, liên hệ Zalo hoặc điện thoại [0344 789 803](tel:+84344789803), cung cấp thông tin lần mua và ảnh liên quan để cửa hàng kiểm tra. Thời hạn đổi trả, điều kiện hoàn tiền và cách xử lý chưa được cửa hàng cung cấp. Hãy hỏi và thống nhất trước khi mua; trang này không đưa ra cam kết đổi trả chưa được xác nhận.'],
                    ['title' => 'Quyền riêng tư', 'body' => 'Biểu mẫu trên website chỉ tạo lời nhắn trong trình duyệt. Nội dung không được lưu vào cơ sở dữ liệu, bộ nhớ lưu trữ của trình duyệt hoặc tự động gửi về cửa hàng. Không cần nhập tên, số điện thoại hay địa chỉ để xem trà và soạn yêu cầu. Khi bạn bấm sao chép, nội dung được ghi vào bộ nhớ tạm của thiết bị. Khi mở Zalo, thông tin bạn gửi trong cuộc trò chuyện được xử lý theo chính sách của Zalo và trao đổi với cửa hàng. Website tải phông chữ từ Google Fonts, nên trình duyệt có kết nối tới dịch vụ phông chữ này. Trang hiện không tích hợp công cụ phân tích truy cập hoặc cookie quảng cáo. Chỉ cung cấp thông tin giao hàng cần thiết qua kênh liên hệ đã xác nhận. Nếu cần hỏi về thông tin đã cung cấp khi mua, liên hệ trực tiếp với cửa hàng.'],
                ],
            ]);
        }

        $menuItems = [
            ['label' => 'Trang chủ', 'url' => '/', 'sort_order' => 0],
            ['label' => 'Sản phẩm', 'url' => '/san-pham', 'sort_order' => 1],
            ['label' => 'Bài viết', 'url' => '/bai-viet', 'sort_order' => 2],
            ['label' => 'Mua hàng', 'url' => '/mua-hang', 'sort_order' => 3],
            ['label' => 'Liên hệ', 'url' => '/lien-he', 'sort_order' => 4],
        ];
        foreach ($menuItems as $item) {
            $payload = [...$item, 'target' => '_self', 'is_active' => true];
            MenuItem::query()->firstOrCreate(
                ['label' => $item['label'], 'url' => $item['url']],
                [
                    ...$payload,
                    'publication_status' => 'published',
                    'published_data' => $payload,
                    'published_at' => now(),
                ],
            );
        }
        $seedMenu = collect($menuItems)->map(function (array $item): array {
            $menuItem = MenuItem::query()->where('label', $item['label'])
                ->where('url', $item['url'])->firstOrFail();

            return [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'menu_item_id' => (string) $menuItem->id,
                'children' => [],
            ];
        })->all();
        $this->publishMenu('Header', 'frontend', 'header', $seedMenu);
        $this->publishMenu('Footer', 'frontend', 'footer', $seedMenu);

        $faqRows = [
            ['question' => 'Trà sao củi có gì khác?', 'answer' => 'Trà được sao bằng nguồn nhiệt từ củi theo cách truyền thống. Hương vị còn phụ thuộc vào nguyên liệu và từng mẻ sao.', 'sort_order' => 0],
            ['question' => 'Ít vụn có nghĩa là không có vụn trà?', 'answer' => 'Không hoàn toàn. Trà được sàng lọc kỹ để giảm vụn, nhưng vẫn có thể có vụn tự nhiên.', 'sort_order' => 1],
            ['question' => 'Làm sao để nhận giá và đặt trà?', 'answer' => 'Chọn gói trà, soạn lời nhắn, sau đó mở Zalo để gửi thủ công. Cửa hàng xác nhận giá và đơn trực tiếp.', 'sort_order' => 2],
        ];
        if (! Faq::query()->exists()) {
            foreach ($faqRows as $faq) {
                $payload = [...$faq, 'is_active' => true];
                Faq::create([
                    ...$payload,
                    'publication_status' => 'published',
                    'published_data' => $payload,
                    'published_at' => now(),
                ]);
            }

        }

        $products = [
            ['slug' => 'tra-xanh-thai-nguyen-100g', 'name' => 'Gói làm quen', 'weight_label' => '100 g', 'description' => 'Một gói nhỏ để thử vị trà sao củi.', 'tagline' => 'BẮT ĐẦU THẬT NHẸ', 'photo_url' => '/assets/images (7).jpeg', 'sort_order' => 0],
            ['slug' => 'tra-xanh-thai-nguyen-250g', 'name' => 'Gói mỗi ngày', 'weight_label' => '250 g', 'description' => 'Cho góc trà quen và những phút nghỉ ngơi.', 'tagline' => 'CHO NHỮNG NGÀY THƯỜNG', 'photo_url' => '/assets/images (3).jpeg', 'sort_order' => 1],
            ['slug' => 'tra-xanh-thai-nguyen-500g', 'name' => 'Gói sẻ chia', 'weight_label' => '500 g', 'description' => 'Mời người thân, cùng bạn bè thưởng trà.', 'tagline' => 'NGON HƠN KHI CÙNG NHAU', 'photo_url' => '/assets/images (6).jpeg', 'sort_order' => 2],
        ];
        if (! Product::query()->exists()) {
            foreach ($products as $product) {
                $payload = [...$product, 'price' => null, 'currency' => 'VND', 'gallery' => ['/assets/images (7).jpeg', '/assets/images (3).jpeg', '/assets/images (6).jpeg'], 'category_id' => $category->id];
                Product::create([
                    ...$payload,
                    'publication_status' => 'published',
                    'published_slug' => $product['slug'],
                    'published_data' => $payload,
                    'published_at' => now(),
                ]);
            }
        }

        $media = [
            ['images (3).jpeg', 'Mâm trà với lá chè xanh, trà khô và chén trà vàng'],
            ['images (4).jpeg', 'Gói trà màu vàng cạnh bát trà khô; khối lượng chưa xác định'],
            ['images (6).jpeg', 'Ấm trà màu đen bên chén trà và bát trà khô'],
            ['images (7).jpeg', 'Trà khô, trà đã pha và chén nước trà trên bàn'],
            ['images (8).jpeg', 'Giỏ đựng búp chè tươi giữa vườn chè'],
            ['images (10).jpeg', 'Bộ ấm trà đen và ba chén trà trên bàn gỗ'],
            ['images (11).jpeg', 'Chén trà được cầm trên tay giữa vườn chè xanh'],
            ['doi-che-thai-nguyen.jpg', 'Các luống chè uốn cong theo sườn đồi'],
            ['doi-che-thai-nguyen-1.jpg', 'Người hái chè giữa những luống chè xanh'],
            ['fieldhand-landscape.jpg', 'Phong cảnh minh họa trang trí, không phải ảnh vùng chè'],
            ['fieldhand-cloud.jpg', 'Mây minh họa trang trí trong hero'],
        ];
        foreach ($media as [$filename, $alt]) {
            $relativePath = 'assets/'.$filename;
            $localPath = base_path('../'.$relativePath);
            if (! is_file($localPath)) {
                $localPath = base_path('legacy-assets/'.$filename);
            }
            Media::firstOrCreate(['path' => $relativePath], [
                'disk' => 'legacy',
                'original_name' => $filename,
                'mime_type' => 'image/jpeg',
                'size_bytes' => is_file($localPath) ? filesize($localPath) : 0,
                'alt_text' => $alt,
            ]);
        }
    }

    private function publishMenu(string $name, string $type, string $location, array $value): void
    {
        $menu = Menu::query()->firstOrNew(['type' => $type, 'location' => $location]);
        if ($menu->exists) {
            return;
        }

        $payload = compact('name', 'type', 'location', 'value');
        $menu->fill([
            ...$payload,
            'publication_status' => 'published',
            'published_data' => $payload,
            'published_at' => now(),
        ])->save();
    }

    private function publishSetting(string $name, array $value): void
    {
        SiteSetting::firstOrCreate(['name' => $name], [
            'value' => $value,
            'publication_status' => 'published',
            'published_data' => ['name' => $name, 'value' => $value],
            'published_at' => now(),
        ]);
    }

    private function publishPage(string $slug, string $title, array $content): void
    {
        $payload = ['slug' => $slug, 'title' => $title, 'seo_title' => $title.' — Mộc Trà', 'seo_description' => '', 'content' => $content];
        Page::firstOrCreate(['slug' => $slug], [
            ...$payload,
            'publication_status' => 'published',
            'published_slug' => $slug,
            'published_data' => $payload,
            'published_at' => now(),
        ]);
    }
}
