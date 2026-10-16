<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateCmsAdmin extends Command
{
    protected $signature = 'cms:create-admin {email} {--name=}';

    protected $description = 'Create an administrator without storing a default password';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $name = (string) ($this->option('name') ?: 'Mộc Trà Admin');
        $validator = Validator::make(
            ['email' => $email, 'name' => $name],
            ['email' => ['required', 'email', 'max:255', 'unique:users,email'], 'name' => ['required', 'string', 'max:255']],
        );

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        $password = $this->secret('Nhập mật khẩu (tối thiểu 12 ký tự)');
        $confirmed = $this->secret('Nhập lại mật khẩu');
        if (strlen($password) < 12 || ! hash_equals($password, $confirmed)) {
            $this->error('Mật khẩu phải có ít nhất 12 ký tự và hai lần nhập phải khớp.');

            return self::FAILURE;
        }

        $user = User::create(['name' => $name, 'email' => $email, 'password' => $password, 'is_active' => true]);
        $user->assignRole('admin');
        $this->info("Đã tạo admin {$email}.");

        return self::SUCCESS;
    }
}
