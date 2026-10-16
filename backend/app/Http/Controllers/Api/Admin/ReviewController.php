<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContentRevision;
use App\Services\PublicContentCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('revisions.view'), 403);
        $revisions = ContentRevision::query()
            ->where('status', 'pending')
            ->with(['submittedBy:id,name,email', 'revisionable'])
            ->latest()
            ->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'data' => $revisions->getCollection()->map(fn (ContentRevision $revision) => [
                'id' => $revision->id,
                'resource_type' => $this->resourceType($revision),
                'resource_id' => $revision->revisionable?->getKey(),
                'title' => ($revision->payload['name'] ?? null) === 'menu_layout'
                    ? 'Cây menu header & footer'
                    : ($revision->payload['title'] ?? $revision->payload['name'] ?? $revision->payload['question'] ?? $revision->payload['label'] ?? $revision->payload['slug'] ?? ''),
                'payload' => $revision->payload,
                'submitted_by' => $revision->submittedBy?->only(['id', 'name', 'email']),
                'created_at' => $revision->created_at,
            ])->values(),
            'meta' => [
                'current_page' => $revisions->currentPage(),
                'last_page' => $revisions->lastPage(),
                'total' => $revisions->total(),
            ],
        ]);
    }

    public function approve(Request $request, int $id, PublicContentCache $cache): JsonResponse
    {
        $revision = DB::transaction(function () use ($request, $id, $cache): ContentRevision {
            $revision = ContentRevision::query()->lockForUpdate()->findOrFail($id);
            $this->authorizeReview($request, $revision);
            if ($revision->status !== 'pending') {
                throw new ConflictHttpException('Yêu cầu duyệt đã được xử lý.');
            }

            $record = $revision->revisionable()->lockForUpdate()->firstOrFail();
            if (! method_exists($record, 'publishRevision')) {
                abort(422, 'Dữ liệu này không hỗ trợ xuất bản.');
            }

            $previous = $record->published_data;
            $record->approveRevision($revision->payload);
            $revision->forceFill([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_note' => null,
            ])->save();
            $cache->forgetPublished(class_basename($record), $previous, $revision->payload);

            return $revision;
        });

        return response()->json(['data' => $revision->fresh()]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['review_note' => ['required', 'string', 'min:3', 'max:2000']]);
        $revision = DB::transaction(function () use ($request, $id, $data): ContentRevision {
            $revision = ContentRevision::query()->lockForUpdate()->findOrFail($id);
            $this->authorizeReview($request, $revision);
            if ($revision->status !== 'pending') {
                throw new ConflictHttpException('Yêu cầu duyệt đã được xử lý.');
            }

            $record = $revision->revisionable()->lockForUpdate()->firstOrFail();
            $record->forceFill([
                'publication_status' => $record->published_data ? 'published' : 'rejected',
                'review_note' => $data['review_note'],
            ])->save();
            $revision->forceFill([
                'status' => 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'review_note' => $data['review_note'],
            ])->save();

            return $revision;
        });

        return response()->json(['data' => $revision->fresh()]);
    }

    private function authorizeReview(Request $request, ContentRevision $revision): void
    {
        abort_unless($request->user()->hasRole('admin'), 403, 'Chỉ admin mới được duyệt xuất bản.');
        $type = $this->resourceType($revision);
        abort_unless($type !== null && $request->user()->can("{$type}.approve"), 403);
        if ($request->user()->currentAccessToken() instanceof PersonalAccessToken) {
            abort_unless($request->user()->tokenCan("{$type}.approve"), 403);
        }
    }

    private function resourceType(ContentRevision $revision): ?string
    {
        if (class_basename($revision->revisionable_type) === 'SiteSetting'
            && ($revision->payload['name'] ?? null) === 'menu_layout') {
            return 'menus';
        }

        return match (class_basename($revision->revisionable_type)) {
            'Post' => 'posts',
            'Product' => 'products',
            'Page' => 'pages',
            'Faq' => 'faqs',
            'Menu' => 'menus',
            'MenuItem' => 'menu_items',
            'SiteSetting' => 'settings',
            default => null,
        };
    }
}
