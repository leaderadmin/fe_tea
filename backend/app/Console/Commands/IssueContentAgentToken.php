<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class IssueContentAgentToken extends Command
{
    protected $signature = 'cms:issue-content-agent-token {email} {--name=moc-tra-content-agent}';

    protected $description = 'Issue a 90-day token for a least-privilege content agent account';

    private const REQUIRED_PERMISSIONS = [
        'posts.view',
        'posts.create',
        'posts.update',
        'posts.submit',
        'categories.view',
    ];

    public function handle(): int
    {
        $user = User::query()->where('email', $this->argument('email'))->first();
        if (! $user || ! $user->is_active) {
            $this->error('Không tìm thấy tài khoản đang hoạt động.');

            return self::FAILURE;
        }
        if ($user->hasRole('admin')) {
            $this->error('Không cấp token agent cho tài khoản admin. Hãy dùng tài khoản vai trò editor riêng.');

            return self::FAILURE;
        }
        $tokenName = trim((string) $this->option('name'));
        if ($tokenName === '' || mb_strlen($tokenName) > 255) {
            $this->error('Tên token phải có từ 1 đến 255 ký tự.');

            return self::FAILURE;
        }

        $missingPermissions = array_values(array_filter(
            self::REQUIRED_PERMISSIONS,
            fn (string $permission): bool => ! $user->can($permission),
        ));
        if ($missingPermissions !== []) {
            $this->error('Tài khoản thiếu quyền: '.implode(', ', $missingPermissions));

            return self::FAILURE;
        }
        $extraPermissions = $user->getAllPermissions()->pluck('name')
            ->diff(self::REQUIRED_PERMISSIONS)
            ->values()
            ->all();
        if ($extraPermissions !== []) {
            $this->error('Tài khoản có quyền ngoài phạm vi agent: '.implode(', ', $extraPermissions));

            return self::FAILURE;
        }

        $user->tokens()->where('name', $tokenName)->delete();
        $token = $user->createToken(
            $tokenName,
            self::REQUIRED_PERMISSIONS,
            now()->addDays(90),
        );

        $this->warn('Lưu token ngay vào tệp cục bộ .env.agent. Token chỉ được hiển thị lần này:');
        $this->line($token->plainTextToken);

        return self::SUCCESS;
    }
}
