<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use App\Services\MenuTreeResolver;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PublicContentController extends Controller
{
    public function site(MenuTreeResolver $menuTreeResolver): JsonResponse
    {
        $data = Cache::remember('public:site', now()->addMinutes(5), function () use ($menuTreeResolver): array {
            $settings = SiteSetting::query()->where('name', '!=', 'menu_layout')->whereNotNull('published_data')->get()
                ->mapWithKeys(fn (SiteSetting $setting) => [
                    $setting->published_data['name'] => $setting->published_data['value'],
                ]);
            $menu = MenuItem::query()->whereNotNull('published_data')->get()
                ->map(fn (MenuItem $item) => $item->publishedSnapshot())
                ->filter(fn (array $item) => $item['is_active'] ?? true)
                ->sortBy('sort_order')->values();
            $menuLayout = SiteSetting::query()->where('name', 'menu_layout')->whereNotNull('published_data')->first();
            $menus = Menu::query()->whereNotNull('published_data')->orderBy('id')->get()
                ->map(fn (Menu $menu) => $menu->publishedSnapshot())
                ->filter(fn (array $menu) => $menu['type'] === 'frontend')
                ->groupBy('location');
            $publishedMenuItems = $menu->keyBy(fn (array $item) => (string) $item['id']);
            $legacyTree = $menu->map(fn (array $item) => [
                'id' => (string) $item['id'],
                'menu_item_id' => (string) $item['id'],
                'children' => [],
            ])->all();
            $legacyMenus = $menuLayout?->published_data['value'] ?? [];
            $menus = collect(['header', 'footer'])->mapWithKeys(function (string $location) use (
                $menus,
                $legacyMenus,
                $legacyTree,
                $menuTreeResolver,
                $publishedMenuItems,
            ): array {
                $groups = $menus->get($location, collect());
                $tree = $groups->isNotEmpty()
                    ? $groups->flatMap(fn (array $group) => $menuTreeResolver->resolve($group['value'] ?? [], $publishedMenuItems))->values()->all()
                    : $menuTreeResolver->resolve($legacyMenus[$location] ?? $legacyTree, $publishedMenuItems);

                return [$location => $tree];
            });
            $faqs = Faq::query()->whereNotNull('published_data')->get()
                ->map(fn (Faq $faq) => $faq->publishedSnapshot())
                ->filter(fn (array $item) => $item['is_active'] ?? true)
                ->sortBy('sort_order')->values();

            return ['settings' => $settings, 'menu' => $menu, 'menus' => $menus, 'faqs' => $faqs];
        });

        return response()->json(['data' => $data]);
    }

    public function page(string $slug): JsonResponse
    {
        $data = Cache::remember("public:page:{$slug}", now()->addMinutes(5), function () use ($slug): array {
            $page = Page::query()->where('published_slug', $slug)->whereNotNull('published_data')->first();
            if (! $page) {
                throw new NotFoundHttpException('Không tìm thấy trang.');
            }

            return $page->publishedSnapshot();
        });

        return response()->json(['data' => $data]);
    }

    public function products(): JsonResponse
    {
        $products = Cache::remember('public:products', now()->addMinutes(5), fn () => Product::query()
            ->whereNotNull('published_data')->get()
            ->map(fn (Product $product) => $product->publishedSnapshot())
            ->sortBy('sort_order')->values());

        return response()->json(['data' => $products]);
    }

    public function product(string $slug): JsonResponse
    {
        $product = Cache::remember("public:product:{$slug}", now()->addMinutes(5), function () use ($slug): array {
            $record = Product::query()->where('published_slug', $slug)->whereNotNull('published_data')->first();
            if (! $record) {
                throw new NotFoundHttpException('Không tìm thấy sản phẩm.');
            }

            return $record->publishedSnapshot();
        });

        return response()->json(['data' => $product]);
    }

    public function posts(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 12), 1), 50);
        $pageNumber = max($request->integer('page', 1), 1);
        $version = Cache::remember('public:posts:version', now()->addDay(), fn () => (string) Str::uuid());
        $result = Cache::remember("public:posts:{$version}:{$perPage}:{$pageNumber}", now()->addMinutes(5), function () use ($perPage) {
            $page = Post::query()->whereNotNull('published_data')->orderByDesc('published_at')->paginate($perPage);

            return [
                'data' => $page->getCollection()->map(fn (Post $post) => $post->publishedSnapshot())->values(),
                'meta' => [
                    'current_page' => $page->currentPage(),
                    'per_page' => $page->perPage(),
                    'last_page' => $page->lastPage(),
                    'total' => $page->total(),
                ],
            ];
        });

        return response()->json($result);
    }

    public function post(string $slug): JsonResponse
    {
        $post = Cache::remember("public:post:{$slug}", now()->addMinutes(5), function () use ($slug): array {
            $record = Post::query()->where('published_slug', $slug)->whereNotNull('published_data')->first();
            if (! $record) {
                throw new NotFoundHttpException('Không tìm thấy bài viết.');
            }

            return $record->publishedSnapshot();
        });

        return response()->json(['data' => $post]);
    }
}
