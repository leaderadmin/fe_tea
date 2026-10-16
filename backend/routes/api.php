<?php

use App\Http\Controllers\Api\Admin\AccessController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\EditorialContentController;
use App\Http\Controllers\Api\Admin\MediaController;
use App\Http\Controllers\Api\Admin\MenuController;
use App\Http\Controllers\Api\Admin\ReviewController;
use App\Http\Controllers\Api\PublicContentController;
use App\Http\Middleware\EnsureActiveUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('public')->group(function (): void {
    Route::get('/site', [PublicContentController::class, 'site']);
    Route::get('/pages/{slug}', [PublicContentController::class, 'page']);
    Route::get('/products', [PublicContentController::class, 'products']);
    Route::get('/products/{slug}', [PublicContentController::class, 'product']);
    Route::get('/posts', [PublicContentController::class, 'posts']);
    Route::get('/posts/{slug}', [PublicContentController::class, 'post']);
});

Route::middleware(['auth:sanctum', EnsureActiveUser::class])->prefix('admin')->group(function (): void {
    Route::get('/me', [AccessController::class, 'me']);
    Route::get('/dashboard', DashboardController::class);

    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::post('/reviews/{id}/approve', [ReviewController::class, 'approve'])->whereNumber('id');
    Route::post('/reviews/{id}/reject', [ReviewController::class, 'reject'])->whereNumber('id');
    Route::get('/menus/sidebar', [MenuController::class, 'sidebar']);
    Route::get('/menus', [MenuController::class, 'index']);
    Route::post('/menus', [MenuController::class, 'store']);
    Route::get('/menus/{id}', [MenuController::class, 'show'])->whereNumber('id');
    Route::put('/menus/{id}', [MenuController::class, 'update'])->whereNumber('id');
    Route::put('/menus/{id}/tree', [MenuController::class, 'updateTree'])->whereNumber('id');
    Route::delete('/menus/{id}', [MenuController::class, 'destroy'])->whereNumber('id');
    Route::post('/menus/{id}/submit', [MenuController::class, 'submit'])->whereNumber('id');

    Route::get('/roles', [AccessController::class, 'roles']);
    Route::post('/roles', [AccessController::class, 'storeRole']);
    Route::put('/roles/{id}', [AccessController::class, 'updateRole'])->whereNumber('id');
    Route::delete('/roles/{id}', [AccessController::class, 'deleteRole'])->whereNumber('id');
    Route::get('/users', [AccessController::class, 'users']);
    Route::post('/users', [AccessController::class, 'storeUser']);
    Route::put('/users/{id}', [AccessController::class, 'updateUser'])->whereNumber('id');

    Route::get('/media', [MediaController::class, 'index']);
    Route::post('/media', [MediaController::class, 'store']);
    Route::put('/media/{id}', [MediaController::class, 'update'])->whereNumber('id');
    Route::delete('/media/{id}', [MediaController::class, 'destroy'])->whereNumber('id');

    Route::prefix('content/{type}')->group(function (): void {
        Route::get('/', [EditorialContentController::class, 'index']);
        Route::post('/', [EditorialContentController::class, 'store']);
        Route::get('/{id}', [EditorialContentController::class, 'show'])->whereNumber('id');
        Route::put('/{id}', [EditorialContentController::class, 'update'])->whereNumber('id');
        Route::delete('/{id}', [EditorialContentController::class, 'destroy'])->whereNumber('id');
        Route::post('/{id}/submit', [EditorialContentController::class, 'submit'])->whereNumber('id');
    });
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
