<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Post;
use App\Services\PublicContentCache;
use Illuminate\Database\Seeder;

class SampleBlogSeeder extends Seeder
{
    public function run(): void
    {
        $category = Category::query()->firstOrCreate(
            ['type' => 'post', 'slug' => 'cau-chuyen-tra'],
            [
                'name' => 'Câu chuyện trà',
                'description' => 'Ghi chép về trà xanh Thái Nguyên, cách chế biến và những điều nên biết khi chọn trà.',
            ],
        );

        $slug = 'sao-cui-sang-loc-va-cach-chon-tra-xanh-thai-nguyen';
        $payload = [
            'slug' => $slug,
            'title' => 'Sao củi, sàng lọc và cách chọn trà xanh Thái Nguyên',
            'excerpt' => 'Tìm hiểu ý nghĩa của cách sao củi, việc sàng lọc trà và những thông tin nên hỏi trước khi chọn mua.',
            'body' => <<<'MARKDOWN'
Trà xanh Thái Nguyên có thể khác nhau theo nguyên liệu, cách chế biến, bảo quản và cách pha. Khi chọn trà, hãy tìm hiểu thông tin của từng sản phẩm và hỏi cửa hàng nếu cần tư vấn.

## Sao củi là cách chế biến

Sao bằng củi là một cách làm truyền thống. Tên gọi cho biết phương pháp sao, nhưng không tự nó bảo đảm hương vị hay chất lượng giống nhau ở mọi mẻ trà. Khẩu vị mỗi người cũng khác nhau, vì vậy bạn có thể hỏi cửa hàng về sản phẩm cụ thể trước khi chọn.

## Sàng lọc để giảm vụn

Trà được sàng lọc kỹ nhằm giảm phần vụn. Trà khô vẫn có thể còn vụn tự nhiên; “ít vụn” không có nghĩa là hoàn toàn không có vụn.

## Hỏi rõ trước khi mua

Bạn nên hỏi quy cách đang bán, giá theo lượng, cách bảo quản và phí giao tới khu vực của mình. Giá và giao hàng được cửa hàng xác nhận trực tiếp qua Zalo; website không tự chốt đơn.
MARKDOWN,
            'cover_url' => null,
            'category_id' => $category->id,
            'seo_title' => 'Cách chọn trà xanh Thái Nguyên sao củi — Mộc Trà',
            'seo_description' => 'Tìm hiểu cách sao củi, sàng lọc trà và thông tin cần hỏi khi chọn trà xanh Thái Nguyên.',
        ];

        $post = Post::query()->firstOrCreate(
            ['slug' => $slug],
            [
                ...$payload,
                'publication_status' => 'published',
                'published_slug' => $slug,
                'published_data' => $payload,
                'published_at' => now(),
            ],
        );

        if ($post->wasRecentlyCreated) {
            app(PublicContentCache::class)->forgetPublished('Post', null, $payload);
        }
    }
}
