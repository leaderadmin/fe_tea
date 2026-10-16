<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContentRevision;
use App\Models\Faq;
use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('dashboard.view'), 403);

        $types = [
            'posts' => Post::class,
            'products' => Product::class,
            'pages' => Page::class,
            'menus' => Menu::class,
            'menu_items' => MenuItem::class,
            'faqs' => Faq::class,
            'settings' => SiteSetting::class,
        ];
        $counts = [];
        foreach ($types as $key => $model) {
            $query = $model::query();
            if ($key === 'settings') {
                $query->where('name', '!=', 'menu_layout');
            }
            $counts[$key] = [
                'total' => (clone $query)->count(),
                'published' => (clone $query)->whereNotNull('published_data')->count(),
                'draft' => $query->where('publication_status', 'draft')->count(),
            ];
        }

        return response()->json(['data' => [
            'counts' => $counts,
            'pending_reviews' => ContentRevision::query()->where('status', 'pending')->count(),
        ]]);
    }
}
