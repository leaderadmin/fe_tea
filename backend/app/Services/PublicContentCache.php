<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class PublicContentCache
{
    public function forgetPublished(string $type, ?array $previous, array $current): void
    {
        if (in_array($type, ['Faq', 'Menu', 'MenuItem', 'SiteSetting'], true)) {
            Cache::forget('public:site');

            return;
        }

        if ($type === 'Page') {
            $this->forgetSlugs('public:page:', $previous, $current);

            return;
        }

        if ($type === 'Product') {
            Cache::forget('public:products');
            $this->forgetSlugs('public:product:', $previous, $current);

            return;
        }

        if ($type === 'Post') {
            Cache::forget('public:posts:version');
            $this->forgetSlugs('public:post:', $previous, $current);
        }
    }

    private function forgetSlugs(string $prefix, ?array $previous, array $current): void
    {
        foreach (array_unique(array_filter([$previous['slug'] ?? null, $current['slug'] ?? null])) as $slug) {
            Cache::forget($prefix.$slug);
        }
    }
}
