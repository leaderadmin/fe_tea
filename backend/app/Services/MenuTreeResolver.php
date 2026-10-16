<?php

namespace App\Services;

use Illuminate\Support\Collection;

class MenuTreeResolver
{
    public function resolve(array $nodes, Collection $publishedItems): array
    {
        $resolved = [];
        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }
            $menuItemId = $node['menu_item_id'] ?? null;
            if ($menuItemId === null) {
                $match = $publishedItems->first(fn (array $item) =>
                    ($item['label'] ?? null) === ($node['label'] ?? null)
                    && ($item['url'] ?? null) === ($node['url'] ?? null));
                $menuItemId = $match['id'] ?? null;
            }
            $item = $menuItemId === null ? null : $publishedItems->get((string) $menuItemId);
            if (! $item) {
                continue;
            }
            $resolved[] = [
                'id' => $node['id'] ?? (string) $item['id'],
                'label' => $item['label'],
                'url' => $item['url'],
                'target' => $item['target'] ?? '_self',
                'is_active' => $item['is_active'] ?? true,
                'children' => $this->resolve($node['children'] ?? [], $publishedItems),
            ];
        }

        return $resolved;
    }
}
