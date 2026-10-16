<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->migrateMenuItemPermissions();
        Schema::create('menus', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 190);
            $table->string('type', 16);
            $table->string('location', 24);
            $table->json('value');
            $table->string('publication_status', 24)->default('draft')->index();
            $table->string('published_slug')->nullable()->unique();
            $table->json('published_data')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->text('review_note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $setting = DB::table('site_settings')->where('name', 'menu_layout')->first();
        if (! $setting) {
            return;
        }

        $items = DB::table('menu_items')->get()->all();
        $current = $this->decode($setting->value);
        $published = $this->decode($setting->published_data);
        $pendingRevisions = DB::table('content_revisions')
            ->where('revisionable_type', 'App\\Models\\SiteSetting')
            ->where('revisionable_id', $setting->id)
            ->where('status', 'pending')
            ->get();

        foreach (['header' => 'Header', 'footer' => 'Footer'] as $location => $name) {
            $items = DB::table('menu_items')->get()->all();
            $value = $this->convertTree($current[$location] ?? [], $items);
            $items = DB::table('menu_items')->get()->all();
            $publishedValue = isset($published['value'][$location])
                ? $this->convertTree($published['value'][$location], $items)
                : null;
            $status = $setting->publication_status === 'pending_review'
                ? ($publishedValue === null ? 'draft' : 'published')
                : $setting->publication_status;
            $now = now();
            $menuId = DB::table('menus')->insertGetId([
                'name' => $name,
                'type' => 'frontend',
                'location' => $location,
                'value' => json_encode($value),
                'publication_status' => $status,
                'published_data' => $publishedValue === null ? null : json_encode([
                    'name' => $name,
                    'type' => 'frontend',
                    'location' => $location,
                    'value' => $publishedValue,
                ]),
                'published_at' => $publishedValue !== null ? $setting->published_at : null,
                'created_by' => $setting->created_by,
                'updated_by' => $setting->updated_by,
                'created_at' => $setting->created_at,
                'updated_at' => $setting->updated_at,
            ]);

            foreach ($pendingRevisions as $revision) {
                $payload = $this->decode($revision->payload);
                if (($payload['name'] ?? null) !== 'menu_layout') {
                    continue;
                }
                $items = DB::table('menu_items')->get()->all();
                $revisionTree = $this->convertTree($payload['value'][$location] ?? [], $items);
                DB::table('content_revisions')->insert([
                    'revisionable_type' => 'App\\Models\\Menu',
                    'revisionable_id' => $menuId,
                    'payload' => json_encode([
                        'name' => $name,
                        'type' => 'frontend',
                        'location' => $location,
                        'value' => $revisionTree,
                    ]),
                    'status' => 'pending',
                    'submitted_by' => $revision->submitted_by,
                    'reviewed_by' => null,
                    'review_note' => null,
                    'reviewed_at' => null,
                    'created_at' => $revision->created_at,
                    'updated_at' => $revision->updated_at,
                ]);
                DB::table('menus')->where('id', $menuId)->update(['publication_status' => 'pending_review']);
            }
        }

        DB::table('site_settings')->where('id', $setting->id)->update([
            'value' => json_encode(['header' => [], 'footer' => []]),
            'published_data' => $published ? json_encode([
                'name' => 'menu_layout',
                'value' => ['header' => [], 'footer' => []],
            ]) : null,
            'publication_status' => $setting->publication_status === 'pending_review' ? 'draft' : $setting->publication_status,
            'updated_at' => now(),
        ]);

        foreach ($pendingRevisions as $revision) {
            $payload = $this->decode($revision->payload);
            if (($payload['name'] ?? null) === 'menu_layout') {
                DB::table('content_revisions')->where('id', $revision->id)->update([
                    'status' => 'rejected',
                    'review_note' => 'Tách thành các menu Header/Footer. Gửi duyệt từng menu mới.',
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('menus');
    }

    private function decode(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = is_string($value) ? json_decode($value, true) : null;

        return is_array($decoded) ? $decoded : [];
    }

    private function migrateMenuItemPermissions(): void
    {
        $tableNames = config('permission.table_names');
        if (! Schema::hasTable($tableNames['permissions']) || ! Schema::hasTable($tableNames['role_has_permissions'])) {
            return;
        }
        $permissionsTable = $tableNames['permissions'];
        $rolePermissionsTable = $tableNames['role_has_permissions'];
        foreach (['view', 'create', 'update', 'delete', 'submit', 'approve'] as $action) {
            $old = DB::table($permissionsTable)->where(['name' => "menus.{$action}", 'guard_name' => 'web'])->first();
            if (! $old) {
                continue;
            }
            DB::table($permissionsTable)->insertOrIgnore([
                'name' => "menu_items.{$action}",
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $newId = DB::table($permissionsTable)
                ->where(['name' => "menu_items.{$action}", 'guard_name' => 'web'])
                ->value('id');
            $roleIds = DB::table($rolePermissionsTable)->where('permission_id', $old->id)->pluck('role_id');
            DB::table($rolePermissionsTable)->insertOrIgnore($roleIds->map(fn ($roleId) => [
                'permission_id' => $newId,
                'role_id' => $roleId,
            ])->all());
        }
        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    private function convertTree(array $nodes, array $items): array
    {
        $converted = [];
        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }
            $menuItemId = $node['menu_item_id'] ?? null;
            if ($menuItemId !== null && ! collect($items)->contains(fn (object $item) => (string) $item->id === (string) $menuItemId)) {
                $menuItemId = null;
            }
            if ($menuItemId === null) {
                foreach ($items as $item) {
                    $publishedData = $this->decode($item->published_data);
                    $matchesCurrent = $item->label === ($node['label'] ?? null)
                        && $item->url === ($node['url'] ?? null);
                    $matchesPublished = ($publishedData['label'] ?? null) === ($node['label'] ?? null)
                        && ($publishedData['url'] ?? null) === ($node['url'] ?? null);
                    if ($matchesCurrent || $matchesPublished) {
                        $menuItemId = $item->id;
                        break;
                    }
                }
            }
            if ($menuItemId === null && isset($node['label'], $node['url'])) {
                $payload = [
                    'label' => $node['label'],
                    'url' => $node['url'],
                    'target' => $node['target'] ?? '_self',
                    'sort_order' => count($items),
                    'is_active' => $node['is_active'] ?? true,
                ];
                $menuItemId = DB::table('menu_items')->insertGetId([
                    ...$payload,
                    'publication_status' => 'published',
                    'published_data' => json_encode($payload),
                    'published_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $items[] = (object) ['id' => $menuItemId, ...$payload, 'published_data' => json_encode($payload)];
            }
            if ($menuItemId === null) {
                continue;
            }
            $converted[] = [
                'id' => (string) ($node['id'] ?? \Illuminate\Support\Str::uuid()),
                'menu_item_id' => (string) $menuItemId,
                'children' => $this->convertTree($node['children'] ?? [], $items),
            ];
        }

        return $converted;
    }
};
