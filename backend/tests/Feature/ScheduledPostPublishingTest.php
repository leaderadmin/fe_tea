<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\CmsContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ScheduledPostPublishingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CmsContentSeeder::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_approved_scheduled_post_stays_private_until_the_scheduler_publishes_it(): void
    {
        $now = Carbon::parse('2026-10-16 09:00:00');
        Carbon::setTestNow($now);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        $postId = $this->postJson('/api/admin/content/posts', [
            'title' => 'Cách pha trà xanh',
            'slug' => 'cach-pha-tra-xanh',
            'body' => '<p>Hướng dẫn pha trà.</p>',
            'scheduled_at' => $now->copy()->addHour()->toIso8601String(),
        ])->assertCreated()->json('data.id');

        $revisionId = $this->postJson("/api/admin/content/posts/{$postId}/submit")
            ->assertCreated()
            ->json('data.id');

        $this->postJson("/api/admin/reviews/{$revisionId}/approve")->assertOk();
        $this->assertDatabaseHas('posts', [
            'id' => $postId,
            'publication_status' => 'scheduled',
            'published_data' => null,
        ]);
        $this->getJson('/api/public/posts')->assertOk()->assertJsonMissing(['slug' => 'cach-pha-tra-xanh']);

        Artisan::call('cms:publish-scheduled-posts');
        $this->assertDatabaseHas('posts', ['id' => $postId, 'publication_status' => 'scheduled']);

        Carbon::setTestNow($now->copy()->addHour());
        Artisan::call('cms:publish-scheduled-posts');

        $this->assertDatabaseHas('posts', [
            'id' => $postId,
            'publication_status' => 'published',
            'scheduled_data' => null,
        ]);
        $this->getJson('/api/public/posts')->assertOk()->assertJsonPath('data.0.slug', 'cach-pha-tra-xanh');
    }

    public function test_content_agent_token_requires_a_non_admin_user_with_limited_editor_permissions(): void
    {
        $editor = User::factory()->create();
        $editor->assignRole('editor');

        $this->artisan('cms:issue-content-agent-token', ['email' => $editor->email])
            ->expectsOutputToContain('Tài khoản có quyền ngoài phạm vi agent')
            ->assertExitCode(1);

        $agentRole = Role::create(['name' => 'content-agent', 'guard_name' => 'web']);
        $agentRole->syncPermissions([
            'posts.view',
            'posts.create',
            'posts.update',
            'posts.submit',
            'categories.view',
        ]);
        $editor->syncRoles($agentRole);
        $this->artisan('cms:issue-content-agent-token', ['email' => $editor->email])->assertExitCode(0);

        $token = $editor->tokens()->firstOrFail();
        $this->assertSame('moc-tra-content-agent', $token->name);
        $this->assertEqualsCanonicalizing([
            'posts.view',
            'posts.create',
            'posts.update',
            'posts.submit',
            'categories.view',
        ], $token->abilities);
        $this->assertTrue($token->expires_at->isFuture());

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->artisan('cms:issue-content-agent-token', ['email' => $admin->email])
            ->expectsOutputToContain('Không cấp token agent cho tài khoản admin')
            ->assertExitCode(1);
    }

    public function test_content_agent_can_submit_articles_but_cannot_approve_them(): void
    {
        $editor = User::factory()->create();
        $editor->assignRole('editor');
        $token = $editor->createToken('moc-tra-content-agent', [
            'posts.view',
            'posts.create',
            'posts.update',
            'posts.submit',
            'categories.view',
        ])->plainTextToken;

        $postId = $this->withToken($token)->postJson('/api/admin/content/posts', [
            'title' => 'Ghi chép về trà',
            'slug' => 'ghi-chep-ve-tra',
            'body' => '<p>Nội dung chờ kiểm duyệt.</p>',
        ])->assertCreated()->json('data.id');
        $revisionId = $this->withToken($token)->postJson("/api/admin/content/posts/{$postId}/submit")
            ->assertCreated()
            ->json('data.id');

        $this->withToken($token)->postJson("/api/admin/reviews/{$revisionId}/approve")->assertForbidden();
        $this->withToken($token)->deleteJson("/api/admin/content/posts/{$postId}")->assertForbidden();
        $this->assertDatabaseHas('posts', ['id' => $postId, 'publication_status' => 'pending_review']);
    }
}
