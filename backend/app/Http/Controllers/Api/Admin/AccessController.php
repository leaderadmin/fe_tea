<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AccessController extends Controller
{
    private const SYSTEM_ROLES = ['admin', 'editor'];

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => SessionController::userData($request->user())]);
    }

    public function roles(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('roles.view'), 403);
        $roles = Role::query()->where('guard_name', 'web')->with('permissions:id,name')->orderBy('name')->get()
            ->map(fn (Role $role) => $this->roleData($role));
        $permissions = Permission::query()->where('guard_name', 'web')->orderBy('name')->pluck('name')
            ->groupBy(fn (string $name) => str($name)->before('.')->toString());

        return response()->json(['data' => ['roles' => $roles, 'permissions' => $permissions]]);
    }

    public function storeRole(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);
        $request->merge(['name' => trim((string) $request->input('name', ''))]);
        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:64', 'regex:/^[\pL\pN][\pL\pN _.-]*$/u',
                Rule::unique('roles', 'name')->where('guard_name', 'web'),
            ],
            'permissions' => ['sometimes', 'array', 'max:100'],
            'permissions.*' => ['required', 'string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);
        abort_if(in_array(strtolower($data['name']), self::SYSTEM_ROLES, true), 422, 'Tên này dành riêng cho vai trò hệ thống.');

        $role = DB::transaction(function () use ($data): Role {
            $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
            $role->syncPermissions($data['permissions'] ?? []);

            return $role->load('permissions:id,name');
        });

        return response()->json(['data' => $this->roleData($role)], 201);
    }

    public function updateRole(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);
        $role = Role::query()->where('guard_name', 'web')->findOrFail($id);
        abort_if($role->name === 'admin', 422, 'Vai trò admin được bảo vệ và luôn có quyền quản trị.');
        if (is_string($request->input('name'))) {
            $request->merge(['name' => trim($request->input('name'))]);
        }
        $data = $request->validate([
            'name' => [
                'sometimes', 'required', 'string', 'max:64', 'regex:/^[\pL\pN][\pL\pN _.-]*$/u',
                Rule::unique('roles', 'name')->where('guard_name', 'web')->ignore($role->id),
            ],
            'permissions' => ['sometimes', 'array', 'max:100'],
            'permissions.*' => ['required', 'string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);
        if (isset($data['name']) && $data['name'] !== $role->name) {
            abort_if(
                in_array($role->name, self::SYSTEM_ROLES, true)
                    || in_array(strtolower($data['name']), self::SYSTEM_ROLES, true),
                422,
                'Không thể đổi tên vai trò hệ thống.',
            );
        }

        $role = DB::transaction(function () use ($data, $role): Role {
            if (array_key_exists('name', $data)) {
                $role->name = $data['name'];
                $role->save();
            }
            if (array_key_exists('permissions', $data)) {
                $role->syncPermissions($data['permissions']);
            }

            return $role->load('permissions:id,name');
        });

        return response()->json(['data' => $this->roleData($role)]);
    }

    public function deleteRole(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);
        $role = Role::query()->where('guard_name', 'web')->findOrFail($id);
        abort_if(in_array($role->name, self::SYSTEM_ROLES, true), 422, 'Không thể xóa vai trò hệ thống.');
        abort_if(User::role($role->name)->exists(), 422, 'Hãy gỡ vai trò này khỏi tất cả tài khoản trước khi xóa.');

        $role->delete();

        return response()->json(null, 204);
    }

    public function users(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('users.view'), 403);
        $users = User::query()->with('roles:id,name')->orderBy('name')->paginate(50);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => $user->is_active,
                'roles' => $user->getRoleNames(),
            ])->values(),
            'meta' => ['current_page' => $users->currentPage(), 'total' => $users->total()],
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('users.manage'), 403);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'is_active' => ['required', 'boolean'],
        ]);
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'is_active' => $data['is_active'],
        ]);
        $user->syncRoles($data['roles']);

        return response()->json(['data' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'roles' => $user->getRoleNames(),
        ]], 201);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('users.manage'), 403);
        $user = User::query()->findOrFail($id);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'is_active' => ['required', 'boolean'],
            'password' => ['nullable', 'string', 'min:12', 'confirmed'],
        ]);

        $roles = $data['roles'];
        $willRemainAdmin = $data['is_active'] && in_array('admin', $roles, true);
        if ($user->hasRole('admin') && ! $willRemainAdmin) {
            $anotherAdminExists = User::role('admin')->where('is_active', true)->whereKeyNot($user->id)->exists();
            abort_unless($anotherAdminExists, 422, 'Không thể vô hiệu hóa hoặc hạ quyền admin cuối cùng.');
        }
        if ($request->user()->is($user) && ! $willRemainAdmin) {
            abort(422, 'Không thể tự gỡ quyền admin hoặc vô hiệu hóa chính mình.');
        }

        $user->name = $data['name'];
        $user->is_active = $data['is_active'];
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();
        $user->syncRoles($roles);

        return response()->json(['data' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'roles' => $user->getRoleNames(),
        ]]);
    }

    private function roleData(Role $role): array
    {
        $role->loadMissing('permissions:id,name');

        return [
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => $role->permissions->pluck('name')->sort()->values(),
            'is_system' => in_array($role->name, self::SYSTEM_ROLES, true),
        ];
    }
}
