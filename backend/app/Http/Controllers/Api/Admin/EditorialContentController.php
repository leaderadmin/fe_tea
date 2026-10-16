<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Faq;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Services\PublicContentCache;
use App\Services\RichContentSanitizer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class EditorialContentController extends Controller
{
    public function __construct(private readonly RichContentSanitizer $richContentSanitizer) {}

    private const MODELS = [
        'posts' => Post::class,
        'products' => Product::class,
        'pages' => Page::class,
        'faqs' => Faq::class,
        'menu-items' => MenuItem::class,
        'settings' => SiteSetting::class,
        'categories' => Category::class,
    ];

    public function index(Request $request, string $type): JsonResponse
    {
        $this->authorizeFeature($request, $type, 'view');
        $modelClass = $this->modelClass($type);
        $query = $modelClass::query()->latest();
        if ($type === 'settings') {
            $query->where('name', '!=', 'menu_layout');
        }
        if (in_array($type, ['posts', 'products'], true)) {
            $query->with('category:id,name');
        }
        $records = $query->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'data' => $records->getCollection()->map(fn (Model $record) => $this->present($record, $type))->values(),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function show(Request $request, string $type, int $id): JsonResponse
    {
        $this->authorizeFeature($request, $type, 'view');
        $record = $this->modelClass($type)::query()->findOrFail($id);

        return response()->json(['data' => $this->present($record, $type)]);
    }

    public function store(Request $request, string $type): JsonResponse
    {
        $action = $type === 'categories' ? 'manage' : ($type === 'settings' ? 'update' : 'create');
        $this->authorizeFeature($request, $type, $action);
        $data = $this->richContentSanitizer->sanitizePayload($type, $request->validate($this->rules($type)));
        $modelClass = $this->modelClass($type);
        $record = new $modelClass($data);

        if ($type !== 'categories') {
            $record->publication_status = 'draft';
            $record->created_by = $request->user()->id;
            $record->updated_by = $request->user()->id;
        }
        $record->save();

        return response()->json(['data' => $this->present($record, $type)], 201);
    }

    public function update(Request $request, string $type, int $id): JsonResponse
    {
        $action = $type === 'categories' ? 'manage' : 'update';
        $this->authorizeFeature($request, $type, $action);
        $record = DB::transaction(function () use ($request, $type, $id): Model {
            $record = $this->modelClass($type)::query()->lockForUpdate()->findOrFail($id);
            $this->ensureNoPendingReview($record);
            $data = $this->richContentSanitizer->sanitizePayload($type, $request->validate($this->rules($type, $record)));
            $record->fill($data);

            if ($type !== 'categories') {
                $record->publication_status = 'draft';
                $record->updated_by = $request->user()->id;
                if ($record instanceof Post) {
                    $record->scheduled_data = null;
                }
            }
            $record->save();

            return $record;
        });

        return response()->json(['data' => $this->present($record->refresh(), $type)]);
    }

    public function destroy(Request $request, string $type, int $id, PublicContentCache $cache): JsonResponse
    {
        $this->authorizeFeature($request, $type, $type === 'categories' ? 'manage' : 'delete');
        DB::transaction(function () use ($type, $id, $cache): void {
            $record = $this->modelClass($type)::query()->lockForUpdate()->findOrFail($id);
            $this->ensureNoPendingReview($record);
            if ($record instanceof MenuItem && $this->isMenuItemReferenced($record)) {
                throw new ConflictHttpException('Menu item đang được dùng trong một menu. Hãy gỡ item khỏi các menu rồi thử lại.');
            }
            if (method_exists($record, 'publicationPayload')) {
                $cache->forgetPublished(class_basename($record), $record->published_data, []);
            }
            $record->delete();
        });

        return response()->json(['message' => 'Đã xóa nội dung.']);
    }

    private function isMenuItemReferenced(MenuItem $item): bool
    {
        $menus = Menu::query()->get();
        $published = $item->published_data ?? [];
        $legacySnapshots = [
            ['label' => $item->label, 'url' => $item->url],
            ['label' => $published['label'] ?? null, 'url' => $published['url'] ?? null],
        ];
        foreach ($menus as $menu) {
            if ($this->treeReferencesMenuItem($menu->value ?? [], (string) $item->id, $legacySnapshots)
                || $this->treeReferencesMenuItem($menu->published_data['value'] ?? [], (string) $item->id, $legacySnapshots)) {
                return true;
            }
        }

        $setting = SiteSetting::query()->where('name', 'menu_layout')->first();
        foreach ([$setting?->value, $setting?->published_data['value'] ?? null] as $legacyLayout) {
            foreach (['header', 'footer'] as $location) {
                if ($this->treeReferencesMenuItem(
                    $legacyLayout[$location] ?? [],
                    (string) $item->id,
                    $legacySnapshots,
                )) {
                    return true;
                }
            }
        }

        return false;
    }

    private function treeReferencesMenuItem(array $nodes, string $id, array $legacySnapshots): bool
    {
        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }
            $matchesLegacyItem = ! isset($node['menu_item_id'])
                && collect($legacySnapshots)->contains(fn (array $snapshot) =>
                    ($node['label'] ?? null) === $snapshot['label']
                    && ($node['url'] ?? null) === $snapshot['url']);
            if ((string) ($node['menu_item_id'] ?? '') === $id || $matchesLegacyItem) {
                return true;
            }
            if ($this->treeReferencesMenuItem($node['children'] ?? [], $id, $legacySnapshots)) {
                return true;
            }
        }

        return false;
    }

    public function submit(Request $request, string $type, int $id): JsonResponse
    {
        $this->authorizeFeature($request, $type, 'submit');
        $record = $this->modelClass($type)::query()->findOrFail($id);
        if (! method_exists($record, 'submitForReview')) {
            abort(422, 'Loại dữ liệu này không có quy trình xuất bản.');
        }
        $revision = $record->submitForReview($request->user());

        return response()->json(['data' => $revision], 201);
    }

    private function modelClass(string $type): string
    {
        abort_unless(isset(self::MODELS[$type]), 404, 'Không tìm thấy mô-đun CMS.');

        return self::MODELS[$type];
    }

    private function authorizeFeature(Request $request, string $type, string $action): void
    {
        $feature = $type === 'menu-items' ? 'menu_items' : $type;
        $permission = "{$feature}.{$action}";
        $user = $request->user();
        abort_unless($user?->can($permission), 403, 'Bạn không có quyền thực hiện thao tác này.');
        if ($user->currentAccessToken() instanceof PersonalAccessToken) {
            abort_unless($user->tokenCan($permission), 403, 'Token không có phạm vi cho thao tác này.');
        }
    }

    private function ensureNoPendingReview(Model $record): void
    {
        if (method_exists($record, 'hasPendingRevision') && $record->hasPendingRevision()) {
            throw new ConflictHttpException('Nội dung đang chờ admin duyệt, chưa thể chỉnh sửa hoặc xóa.');
        }
    }

    private function rules(string $type, ?Model $record = null): array
    {
        $unique = fn (string $table, string $column = 'slug') => Rule::unique($table, $column)->ignore($record?->getKey());
        $uniqueSlug = fn (string $table) => [
            Rule::unique($table, 'slug')->ignore($record?->getKey()),
            Rule::unique($table, 'published_slug')->ignore($record?->getKey()),
        ];
        $categoryRule = fn (string $categoryType) => [
            'nullable',
            Rule::exists('categories', 'id')->where(fn ($query) => $query->where('type', $categoryType)),
        ];

        return match ($type) {
            'posts' => [
                'title' => ['required', 'string', 'max:200'],
                'slug' => ['required', 'string', 'max:190', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', ...$uniqueSlug('posts')],
                'excerpt' => ['nullable', 'string', 'max:500'],
                'body' => ['required', 'string', 'max:100000'],
                'cover_url' => ['nullable', 'string', 'max:2048'],
                'category_id' => $categoryRule('post'),
                'seo_title' => ['nullable', 'string', 'max:190'],
                'seo_description' => ['nullable', 'string', 'max:320'],
                'scheduled_at' => ['nullable', 'date', 'after:now'],
            ],
            'products' => [
                'name' => ['required', 'string', 'max:200'],
                'slug' => ['required', 'string', 'max:190', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', ...$uniqueSlug('products')],
                'weight_label' => ['nullable', 'string', 'max:80'],
                'description' => ['required', 'string', 'max:5000'],
                'tagline' => ['nullable', 'string', 'max:190'],
                'price' => ['nullable', 'numeric', 'min:0'],
                'currency' => ['required', 'string', 'size:3', 'regex:/^[A-Z]{3}$/'],
                'photo_url' => ['nullable', 'string', 'max:2048'],
                'gallery' => ['nullable', 'array', 'max:20'],
                'gallery.*' => ['string', 'max:2048'],
                'category_id' => $categoryRule('product'),
                'seo_title' => ['nullable', 'string', 'max:190'],
                'seo_description' => ['nullable', 'string', 'max:320'],
                'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
            ],
            'pages' => [
                'title' => ['required', 'string', 'max:200'],
                'slug' => ['required', 'string', 'max:190', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', ...$uniqueSlug('pages')],
                'seo_title' => ['nullable', 'string', 'max:190'],
                'seo_description' => ['nullable', 'string', 'max:320'],
                'content' => ['required', 'array'],
            ],
            'faqs' => [
                'question' => ['required', 'string', 'max:500'],
                'answer' => ['required', 'string', 'max:10000'],
                'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
                'is_active' => ['required', 'boolean'],
            ],
            'menu-items' => [
                'label' => ['required', 'string', 'max:190'],
                'url' => ['required', 'string', 'max:2048', 'regex:/^(\/(?!\/)|https?:\/\/)/i'],
                'target' => ['required', Rule::in(['_self', '_blank'])],
                'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
                'is_active' => ['required', 'boolean'],
            ],
            'settings' => [
                'name' => ['required', Rule::in(['brand', 'contact', 'seo', 'social', 'theme']), $unique('site_settings', 'name')],
                'value' => ['required', 'array'],
            ],
            'categories' => [
                'type' => ['required', Rule::in(['post', 'product'])],
                'name' => ['required', 'string', 'max:190'],
                'slug' => [
                    'required', 'string', 'max:190', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                    Rule::unique('categories', 'slug')
                        ->where(fn ($query) => $query->where('type', request()->input('type')))
                        ->ignore($record?->getKey()),
                ],
                'description' => ['nullable', 'string', 'max:5000'],
            ],
            default => abort(404, 'Không tìm thấy mô-đun CMS.'),
        };
    }

    private function present(Model $record, string $type): array
    {
        $data = $record->toArray();
        if (method_exists($record, 'hasPendingRevision')) {
            $data['has_pending_revision'] = $record->hasPendingRevision();
        }
        if (in_array($type, ['posts', 'products'], true)) {
            $data['category'] = $record->category;
        }

        return $data;
    }
}
