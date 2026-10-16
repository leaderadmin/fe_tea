<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Models\User;
use Database\Seeders\CmsContentSeeder;
use Database\Seeders\CmsNavigationSeeder;
use Database\Seeders\SampleBlogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CmsEditorialWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CmsContentSeeder::class);
    }

    public function test_all_settings_groups_are_published_for_the_storefront(): void
    {
        $settings = $this->getJson('/api/public/site')->assertOk()->json('data.settings');

        $this->assertEqualsCanonicalizing(['brand', 'contact', 'seo', 'social', 'theme'], array_keys($settings));
        $this->assertSame('0344789803', $settings['contact']['phone']);
        $this->assertSame('#4a5d0e', $settings['theme']['primary_color']);
    }

    public function test_frontend_menu_trees_publish_independently_and_reuse_menu_items(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin)->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.counts.menus.total', 2)
            ->assertJsonPath('data.counts.menu_items.total', 5);
        $this->getJson('/api/admin/menus')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/admin/content/menu-items?per_page=100')
            ->assertOk()
            ->assertJsonCount(5, 'data');
        $headerMenu = Menu::query()->where('type', 'frontend')->where('location', 'header')->firstOrFail();
        $footerMenu = Menu::query()->where('type', 'frontend')->where('location', 'footer')->firstOrFail();
        $menuItems = MenuItem::query()->get()->keyBy('label');
        $header = [[
            'id' => 'header-products',
            'menu_item_id' => (string) $menuItems['Sản phẩm']->id,
            'children' => [[
                'id' => 'header-featured',
                'menu_item_id' => (string) $menuItems['Bài viết']->id,
                'children' => [],
            ]],
        ]];
        $footer = [[
            'id' => 'footer-products',
            'menu_item_id' => (string) $menuItems['Sản phẩm']->id,
            'children' => [],
        ]];

        $this->putJson("/api/admin/menus/{$headerMenu->id}/tree", ['value' => $header])
            ->assertOk()
            ->assertJsonPath('data.value.0.children.0.menu_item_id', (string) $menuItems['Bài viết']->id);
        $this->putJson("/api/admin/menus/{$footerMenu->id}/tree", ['value' => $footer])
            ->assertOk()
            ->assertJsonPath('data.value.0.menu_item_id', (string) $menuItems['Sản phẩm']->id);

        $this->getJson('/api/public/site')
            ->assertOk()
            ->assertJsonPath('data.menus.header.0.label', 'Trang chủ');

        $headerRevisionId = $this->postJson("/api/admin/menus/{$headerMenu->id}/submit")
            ->assertCreated()
            ->json('data.id');
        $footerRevisionId = $this->postJson("/api/admin/menus/{$footerMenu->id}/submit")
            ->assertCreated()
            ->json('data.id');
        $this->getJson('/api/admin/reviews')
            ->assertOk()
            ->assertJsonFragment(['title' => 'Header'])
            ->assertJsonFragment(['title' => 'Footer']);
        $this->postJson("/api/admin/reviews/{$headerRevisionId}/approve")->assertOk();
        $this->postJson("/api/admin/reviews/{$footerRevisionId}/approve")->assertOk();

        $this->getJson('/api/public/site')
            ->assertOk()
            ->assertJsonPath('data.menus.header.0.label', 'Sản phẩm')
            ->assertJsonPath('data.menus.header.0.children.0.label', 'Bài viết')
            ->assertJsonPath('data.menus.footer.0.label', 'Sản phẩm');

        $this->deleteJson("/api/admin/content/menu-items/{$menuItems['Sản phẩm']->id}")->assertStatus(409);
    }

    public function test_backend_menu_is_published_into_the_cms_sidebar(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $payload = [
            'label' => 'Quản lý sản phẩm',
            'url' => '/admin/content/products',
            'target' => '_self',
            'sort_order' => 10,
            'is_active' => true,
        ];
        $menuItem = MenuItem::query()->create([
            ...$payload,
            'publication_status' => 'published',
            'published_data' => $payload,
            'published_at' => now(),
        ]);
        $menu = $this->actingAs($admin)->postJson('/api/admin/menus', [
            'name' => 'Điều hướng CMS',
            'type' => 'backend',
            'location' => 'sidebar',
        ])->assertCreated()->json('data');

        $this->putJson("/api/admin/menus/{$menu['id']}/tree", ['value' => [[
            'id' => 'cms-products',
            'menu_item_id' => (string) $menuItem->id,
            'children' => [],
        ]]])->assertOk();
        $this->postJson("/api/admin/menus/{$menu['id']}/submit")->assertCreated();
        $revision = \App\Models\ContentRevision::query()
            ->where('revisionable_type', Menu::class)
            ->where('revisionable_id', $menu['id'])
            ->firstOrFail();
        $this->postJson("/api/admin/reviews/{$revision->id}/approve")->assertOk();

        $this->getJson('/api/admin/menus/sidebar')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Điều hướng CMS')
            ->assertJsonPath('data.0.items.0.label', 'Quản lý sản phẩm');
        $this->getJson('/api/public/site')->assertOk()->assertJsonPath('data.menus.header.0.label', 'Trang chủ');

        $limitedRole = Role::create(['name' => 'product-viewer', 'guard_name' => 'web']);
        $limitedRole->syncPermissions(['menus.view', 'menu_items.view']);
        $limitedUser = User::factory()->create();
        $limitedUser->assignRole($limitedRole);
        $this->actingAs($limitedUser)->getJson('/api/admin/menus/sidebar')
            ->assertOk()
            ->assertJsonPath('data.0.items', []);
    }

    public function test_default_cms_navigation_is_grouped_and_permission_filtered(): void
    {
        $this->seed(CmsNavigationSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $sidebar = $this->actingAs($admin)->getJson('/api/admin/menus/sidebar')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Quản trị CMS')
            ->assertJsonPath('data.0.items.0.label', 'Nội dung')
            ->assertJsonPath('data.0.items.0.children.0.label', 'Bài viết')
            ->assertJsonPath('data.0.items.1.label', 'Điều hướng')
            ->assertJsonPath('data.0.items.2.label', 'Cấu hình');

        $productViewer = Role::create(['name' => 'product-menu-viewer', 'guard_name' => 'web']);
        $productViewer->syncPermissions(['dashboard.view', 'products.view']);
        $user = User::factory()->create();
        $user->assignRole($productViewer);
        $this->actingAs($user)->getJson('/api/admin/menus/sidebar')
            ->assertOk()
            ->assertJsonPath('data.0.items.0.label', 'Nội dung')
            ->assertJsonPath('data.0.items.0.children.0.label', 'Sản phẩm')
            ->assertJsonCount(1, 'data.0.items.0.children')
            ->assertJsonCount(1, 'data.0.items');
    }

    public function test_sample_blog_post_is_published_in_its_category(): void
    {
        $this->seed(SampleBlogSeeder::class);

        $category = \App\Models\Category::query()->where('type', 'post')->where('slug', 'cau-chuyen-tra')->firstOrFail();
        $this->getJson('/api/public/posts')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'sao-cui-sang-loc-va-cach-chon-tra-xanh-thai-nguyen')
            ->assertJsonPath('data.0.category_id', $category->id);
        $this->getJson('/api/public/posts/sao-cui-sang-loc-va-cach-chon-tra-xanh-thai-nguyen')
            ->assertOk()
            ->assertJsonPath('data.title', 'Sao củi, sàng lọc và cách chọn trà xanh Thái Nguyên');
    }

    public function test_legacy_menu_layout_is_migrated_into_separate_frontend_menus(): void
    {
        $item = MenuItem::query()->where('label', 'Sản phẩm')->firstOrFail();
        $legacyTree = [[
            'id' => 'legacy-products',
            'label' => $item->label,
            'url' => $item->url,
            'target' => '_self',
            'is_active' => true,
            'children' => [],
        ]];
        $legacyValue = ['header' => $legacyTree, 'footer' => []];
        SiteSetting::query()->create([
            'name' => 'menu_layout',
            'value' => $legacyValue,
            'publication_status' => 'published',
            'published_data' => ['name' => 'menu_layout', 'value' => $legacyValue],
            'published_at' => now(),
        ]);
        Schema::dropIfExists('menus');
        $migration = require database_path('migrations/2026_10_14_042615_create_menus_table.php');
        $migration->up();

        $header = Menu::query()->where('location', 'header')->firstOrFail();
        $this->assertSame((string) $item->id, $header->value[0]['menu_item_id']);
        $this->assertSame((string) $item->id, $header->published_data['value'][0]['menu_item_id']);
        Cache::forget('public:site');
        $this->getJson('/api/public/site')
            ->assertOk()
            ->assertJsonPath('data.menus.header.0.label', 'Sản phẩm')
            ->assertJsonPath('data.menus.footer', []);
    }

    public function test_admin_can_authenticate_and_access_the_admin_api(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->postJson('/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('data.is_admin', true);

        $this->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonPath('data.id', $admin->id);

        $this->postJson('/logout')->assertOk();
        Auth::forgetGuards();
        $this->get('/api/admin/me')->assertUnauthorized();
    }

    public function test_editor_changes_are_private_until_an_admin_approves_them(): void
    {
        $editor = User::factory()->create();
        $editor->assignRole('editor');
        $this->assertTrue($editor->is_active);
        $this->assertTrue($editor->can('products.update'));
        $this->assertTrue($editor->can('dashboard.view'));
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $product = Product::query()->firstOrFail();
        $originalSlug = $product->published_slug;
        $payload = $product->publicationPayload();
        $payload['name'] = 'Trà thử nghiệm đã biên tập';
        $payload['slug'] = 'tra-thu-nghiem-da-bien-tap';

        $this->getJson("/api/public/products/{$originalSlug}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Gói làm quen');

        $this->actingAs($editor)
            ->putJson("/api/admin/content/products/{$product->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.publication_status', 'draft');

        $revisionId = $this->postJson("/api/admin/content/products/{$product->id}/submit")
            ->assertCreated()
            ->json('data.id');

        $this->getJson("/api/public/products/{$originalSlug}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Gói làm quen');
        $this->postJson("/api/admin/reviews/{$revisionId}/approve")->assertForbidden();

        $this->actingAs($admin)
            ->postJson("/api/admin/reviews/{$revisionId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->getJson("/api/public/products/{$originalSlug}")->assertNotFound();
        $this->getJson('/api/public/products/tra-thu-nghiem-da-bien-tap')
            ->assertOk()
            ->assertJsonPath('data.name', 'Trà thử nghiệm đã biên tập');
    }

    public function test_editor_cannot_access_admin_review_actions_or_change_role_permissions(): void
    {
        $this->get('/api/admin/dashboard')
            ->assertUnauthorized()
            ->assertHeader('content-type', 'application/json');

        $editor = User::factory()->create();
        $editor->assignRole('editor');
        $this->assertTrue($editor->is_active);
        $this->assertTrue($editor->can('dashboard.view'));

        $this->actingAs($editor)->getJson('/api/admin/dashboard')->assertOk();
        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson('/api/admin/roles')->assertForbidden();
    }

    public function test_rich_content_is_sanitized_for_products_and_nested_page_content(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $product = Product::query()->firstOrFail();
        $productPayload = $product->publicationPayload();
        $productPayload['description'] = '<p>Trà <strong>sạch</strong></p><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">xem thêm</a>';

        $productResponse = $this->actingAs($admin)
            ->putJson("/api/admin/content/products/{$product->id}", $productPayload)
            ->assertOk();
        $productHtml = $productResponse->json('data.description');

        $this->assertStringContainsString('<strong>sạch</strong>', $productHtml);
        $this->assertStringNotContainsString('<script', $productHtml);
        $this->assertStringNotContainsString('onclick', $productHtml);
        $this->assertStringNotContainsString('javascript:', $productHtml);

        $page = Page::query()->where('slug', 'home')->firstOrFail();
        $pagePayload = $page->publicationPayload();
        $pagePayload['content']['story']['body'] = '<p>Vị trà <em>đậm đà</em></p><svg><script>alert(1)</script></svg>';

        $pageResponse = $this->putJson("/api/admin/content/pages/{$page->id}", $pagePayload)
            ->assertOk();
        $pageHtml = $pageResponse->json('data.content.story.body');

        $this->assertStringContainsString('<em>đậm đà</em>', $pageHtml);
        $this->assertStringNotContainsString('<svg', $pageHtml);
        $this->assertStringNotContainsString('<script', $pageHtml);
    }
}
