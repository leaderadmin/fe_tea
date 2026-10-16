<?php

namespace Tests\Unit;

use App\Services\MenuTreeResolver;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

class MenuTreeResolverTest extends TestCase
{
    public function test_resolves_published_items_recursively_and_skips_missing_items(): void
    {
        $items = new Collection([
            '1' => ['id' => 1, 'label' => 'Shop', 'url' => '/san-pham'],
            '2' => ['id' => 2, 'label' => 'Tea', 'url' => '/tra-xanh', 'target' => '_blank', 'is_active' => false],
            '3' => ['id' => 3, 'label' => 'Contact', 'url' => '/lien-he'],
        ]);
        $nodes = [
            [
                'id' => 'root',
                'menu_item_id' => 1,
                'children' => [
                    ['id' => 'child', 'menu_item_id' => 2],
                    ['menu_item_id' => 999],
                    'invalid node',
                ],
            ],
            ['menu_item_id' => 999],
            'invalid node',
            ['menu_item_id' => 3],
        ];

        $resolved = (new MenuTreeResolver())->resolve($nodes, $items);

        self::assertSame([
            [
                'id' => 'root',
                'label' => 'Shop',
                'url' => '/san-pham',
                'target' => '_self',
                'is_active' => true,
                'children' => [
                    [
                        'id' => 'child',
                        'label' => 'Tea',
                        'url' => '/tra-xanh',
                        'target' => '_blank',
                        'is_active' => false,
                        'children' => [],
                    ],
                ],
            ],
            [
                'id' => '3',
                'label' => 'Contact',
                'url' => '/lien-he',
                'target' => '_self',
                'is_active' => true,
                'children' => [],
            ],
        ], $resolved);
    }

    public function test_resolves_legacy_nodes_by_label_and_url(): void
    {
        $items = new Collection([
            '7' => ['id' => 7, 'label' => 'About', 'url' => '/ve-chung-toi'],
        ]);

        $resolved = (new MenuTreeResolver())->resolve([
            ['label' => 'About', 'url' => '/ve-chung-toi'],
            ['label' => 'About', 'url' => '/wrong-url'],
        ], $items);

        self::assertSame([
            [
                'id' => '7',
                'label' => 'About',
                'url' => '/ve-chung-toi',
                'target' => '_self',
                'is_active' => true,
                'children' => [],
            ],
        ], $resolved);
    }
}
