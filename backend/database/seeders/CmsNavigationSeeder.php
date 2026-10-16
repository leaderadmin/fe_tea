<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\MenuItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CmsNavigationSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            'Nội dung' => [
                ['Bài viết', '/admin/content/posts'],
                ['Sản phẩm', '/admin/content/products'],
                ['Danh mục sản phẩm', '/admin/content/categories'],
                ['Trang nội dung', '/admin/content/pages'],
                ['Câu hỏi thường gặp', '/admin/content/faqs'],
            ],
            'Điều hướng' => [
                ['Quản lý menu', '/admin/menus'],
                ['Danh sách menu item', '/admin/content/menu-items'],
            ],
            'Cấu hình' => [
                ['Cài đặt website', '/admin/content/settings'],
            ],
        ];

        $tree = [];
        $groupOrder = 0;
        foreach ($groups as $groupLabel => $items) {
            $group = $this->publishItem($groupLabel, '#', $groupOrder++);
            $children = [];
            foreach ($items as $sortOrder => [$label, $url]) {
                $item = $this->publishItem($label, $url, $sortOrder);
                $children[] = [
                    'id' => (string) Str::uuid(),
                    'menu_item_id' => (string) $item->id,
                    'children' => [],
                ];
            }
            $tree[] = [
                'id' => (string) Str::uuid(),
                'menu_item_id' => (string) $group->id,
                'children' => $children,
            ];
        }

        $menu = Menu::query()->firstOrNew(['type' => 'backend', 'location' => 'sidebar']);
        if ($menu->exists) {
            return;
        }

        $payload = [
            'name' => 'Quản trị CMS',
            'type' => 'backend',
            'location' => 'sidebar',
            'value' => $tree,
        ];
        $menu->fill([
            ...$payload,
            'publication_status' => 'published',
            'published_data' => $payload,
            'published_at' => now(),
        ])->save();
    }

    private function publishItem(string $label, string $url, int $sortOrder): MenuItem
    {
        $payload = [
            'label' => $label,
            'url' => $url,
            'target' => '_self',
            'sort_order' => $sortOrder,
            'is_active' => true,
        ];

        return MenuItem::query()->firstOrCreate(
            ['label' => $label, 'url' => $url],
            [
                ...$payload,
                'publication_status' => 'published',
                'published_data' => $payload,
                'published_at' => now(),
            ],
        );
    }
}
