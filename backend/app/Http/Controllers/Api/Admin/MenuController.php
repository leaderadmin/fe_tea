<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Services\PublicContentCache;
use App\Services\MenuTreeResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class MenuController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('menus.view'), 403);
        $menus = Menu::query()->orderBy('type')->orderBy('location')->orderBy('name')->get()
            ->map(fn (Menu $menu) => $this->present($menu));

        return response()->json(['data' => $menus]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('menus.view'), 403);

        return response()->json(['data' => $this->present(Menu::query()->findOrFail($id))]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('menus.create'), 403);
        $data = $this->validatedDetails($request);
        $menu = new Menu([
            ...$data,
            'value' => [],
            'publication_status' => 'draft',
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);
        $menu->save();

        return response()->json(['data' => $this->present($menu)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('menus.update'), 403);
        $menu = DB::transaction(function () use ($request, $id): Menu {
            $menu = Menu::query()->lockForUpdate()->findOrFail($id);
            $this->ensureNoPendingReview($menu);
            $menu->fill($this->validatedDetails($request));
            $menu->publication_status = 'draft';
            $menu->updated_by = $request->user()->id;
            $menu->save();

            return $menu;
        });

        return response()->json(['data' => $this->present($menu->refresh())]);
    }

    public function updateTree(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('menus.update'), 403);
        $data = $request->validate(['value' => ['required', 'array', 'max:200']]);
        $menuIds = MenuItem::query()->pluck('id')->map(fn (int $itemId) => (string) $itemId)->all();
        $tree = $this->validateTree($data['value'], $menuIds);
        $menu = DB::transaction(function () use ($request, $id, $tree): Menu {
            $menu = Menu::query()->lockForUpdate()->findOrFail($id);
            $this->ensureNoPendingReview($menu);
            $menu->value = $tree;
            $menu->publication_status = 'draft';
            $menu->updated_by = $request->user()->id;
            $menu->save();

            return $menu;
        });

        return response()->json(['data' => $this->present($menu->refresh())]);
    }

    public function destroy(Request $request, int $id, PublicContentCache $cache): JsonResponse
    {
        abort_unless($request->user()->can('menus.delete'), 403);
        $menu = Menu::query()->findOrFail($id);
        $this->ensureNoPendingReview($menu);
        $cache->forgetPublished('Menu', $menu->published_data, []);
        $menu->delete();

        return response()->json(['message' => 'Đã xóa menu.']);
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('menus.submit'), 403);
        $menu = Menu::query()->findOrFail($id);
        $revision = $menu->submitForReview($request->user());

        return response()->json(['data' => $revision], 201);
    }

    public function sidebar(Request $request, MenuTreeResolver $resolver): JsonResponse
    {
        $groups = Menu::query()->whereNotNull('published_data')->orderBy('id')->get()
            ->map(fn (Menu $menu) => $menu->publishedSnapshot())
            ->filter(fn (array $menu) => $menu['type'] === 'backend' && $menu['location'] === 'sidebar');
        $permissions = $request->user()->getAllPermissions()->pluck('name');
        $publishedItems = MenuItem::query()->whereNotNull('published_data')->get()
            ->map(fn (MenuItem $item) => $item->publishedSnapshot())
            ->filter(fn (array $item) => $item['is_active'] ?? true)
            ->keyBy(fn (array $item) => (string) $item['id']);
        $menus = $groups->map(fn (array $menu) => [
            'id' => $menu['id'],
            'name' => $menu['name'],
            'items' => $this->visibleItems($resolver->resolve($menu['value'] ?? [], $publishedItems), $permissions),
        ])->values();

        return response()->json(['data' => $menus]);
    }

    private function validatedDetails(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'type' => ['required', Rule::in(['frontend', 'backend'])],
            'location' => ['required', Rule::in(['header', 'footer', 'sidebar'])],
        ]);
        $expectedLocations = $data['type'] === 'frontend' ? ['header', 'footer'] : ['sidebar'];
        if (! in_array($data['location'], $expectedLocations, true)) {
            throw ValidationException::withMessages([
                'location' => 'Menu FE chỉ có thể đặt ở Header/Footer; menu BE nằm trong sidebar CMS.',
            ]);
        }
        return $data;
    }

    private function validateTree(array $tree, array $menuIds): array
    {
        $ids = [];
        $count = 0;
        $visit = function (array $nodes, int $depth = 1) use (&$visit, &$ids, &$count, $menuIds): array {
            if ($depth > 8) {
                throw ValidationException::withMessages(['menu' => 'Menu chỉ hỗ trợ tối đa 8 cấp.']);
            }
            $normalized = [];
            foreach ($nodes as $index => $node) {
                if (++$count > 200) {
                    throw ValidationException::withMessages(['menu' => 'Mỗi menu hỗ trợ tối đa 200 mục.']);
                }
                if (! is_array($node)) {
                    throw ValidationException::withMessages(["menu.{$index}" => 'Cấu trúc mục menu không hợp lệ.']);
                }
                $validator = Validator::make($node, [
                    'id' => ['required', 'string', 'max:64'],
                    'menu_item_id' => ['required', 'string', 'max:20', Rule::in($menuIds)],
                    'children' => ['sometimes', 'array', 'max:200'],
                ]);
                if ($validator->fails()) {
                    throw ValidationException::withMessages([
                        "menu.{$index}" => $validator->errors()->all(),
                    ]);
                }
                if (isset($ids[$node['id']])) {
                    throw ValidationException::withMessages(['menu' => 'Mỗi vị trí trong cây cần có ID riêng.']);
                }
                $ids[$node['id']] = true;
                $normalized[] = [
                    'id' => $node['id'],
                    'menu_item_id' => $node['menu_item_id'],
                    'children' => $visit($node['children'] ?? [], $depth + 1),
                ];
            }

            return $normalized;
        };

        return $visit($tree);
    }

    private function visibleItems(array $items, Collection $permissions): array
    {
        $visible = [];
        foreach ($items as $item) {
            $requiredPermission = $this->requiredPermissionForUrl($item['url']);
            if ($requiredPermission !== null && ! $permissions->contains($requiredPermission)) {
                continue;
            }
            $item['children'] = $this->visibleItems($item['children'] ?? [], $permissions);
            if ($item['url'] === '#' && $item['children'] === []) {
                continue;
            }
            $visible[] = $item;
        }

        return $visible;
    }

    private function requiredPermissionForUrl(string $url): ?string
    {
        $path = trim((string) parse_url($url, PHP_URL_PATH), '/');
        if (preg_match('#^admin/content/([^/]+)#', $path, $matches)) {
            $feature = str_replace('-', '_', $matches[1]);
            $features = ['posts', 'products', 'pages', 'categories', 'menus', 'menu_items', 'faqs', 'settings'];

            return in_array($feature, $features, true) ? "{$feature}.view" : 'dashboard.view';
        }

        return match ($path) {
            'admin' => 'dashboard.view',
            'admin/reviews' => 'revisions.view',
            'admin/menus' => 'menus.view',
            'admin/media' => 'media.view',
            'admin/users' => 'users.view',
            'admin/roles' => 'roles.view',
            default => null,
        };
    }

    private function ensureNoPendingReview(Menu $menu): void
    {
        if ($menu->hasPendingRevision()) {
            throw new ConflictHttpException('Menu đang chờ admin duyệt, chưa thể chỉnh sửa.');
        }
    }

    private function present(Menu $menu): array
    {
        return [
            ...$menu->toArray(),
            'has_pending_revision' => $menu->hasPendingRevision(),
        ];
    }
}
