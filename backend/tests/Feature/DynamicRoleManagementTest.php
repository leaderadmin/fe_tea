<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CmsContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DynamicRoleManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CmsContentSeeder::class);
    }

    public function test_admin_can_create_update_assign_and_delete_custom_roles(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        $roleId = $this->postJson('/api/admin/roles', [
            'name' => 'Quản lý nội dung',
            'permissions' => ['posts.view', 'posts.update'],
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Quản lý nội dung')
            ->assertJsonPath('data.permissions.0', 'posts.update')
            ->assertJsonPath('data.is_system', false)
            ->json('data.id');

        $user = User::factory()->create();
        $user->assignRole('Quản lý nội dung');

        $this->putJson("/api/admin/roles/{$roleId}", [
            'name' => 'Biên tập nội dung',
            'permissions' => ['posts.view'],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Biên tập nội dung')
            ->assertJsonPath('data.permissions.0', 'posts.view');

        $this->assertTrue($user->fresh()->hasRole('Biên tập nội dung'));
        $this->deleteJson("/api/admin/roles/{$roleId}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Hãy gỡ vai trò này khỏi tất cả tài khoản trước khi xóa.');

        $user->syncRoles('editor');
        $this->deleteJson("/api/admin/roles/{$roleId}")->assertNoContent();
        $this->assertDatabaseMissing('roles', ['id' => $roleId]);
    }

    public function test_system_roles_cannot_be_created_renamed_or_deleted(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        $editorRoleId = Role::findByName('editor')->id;
        $adminRoleId = Role::findByName('admin')->id;

        $this->postJson('/api/admin/roles', ['name' => 'Admin'])
            ->assertUnprocessable();
        $this->putJson("/api/admin/roles/{$editorRoleId}", ['name' => 'Biên tập viên'])
            ->assertUnprocessable();
        $this->deleteJson("/api/admin/roles/{$editorRoleId}")->assertUnprocessable();
        $this->putJson("/api/admin/roles/{$adminRoleId}", ['permissions' => []])
            ->assertUnprocessable();
        $this->deleteJson("/api/admin/roles/{$adminRoleId}")->assertUnprocessable();
    }

    public function test_only_role_managers_can_change_roles(): void
    {
        $editor = User::factory()->create();
        $editor->assignRole('editor');

        $this->actingAs($editor)
            ->postJson('/api/admin/roles', ['name' => 'Quản lý nội dung'])
            ->assertForbidden();
    }
}
