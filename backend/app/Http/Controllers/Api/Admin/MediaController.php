<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContentRevision;
use App\Models\Faq;
use App\Models\Media;
use App\Models\MenuItem;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('media.view'), 403);
        $query = Media::query()->latest();
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(fn ($builder) => $builder
                ->where('original_name', 'like', "%{$search}%")
                ->orWhere('alt_text', 'like', "%{$search}%"));
        }
        $media = $query->paginate(min(max($request->integer('per_page', 30), 1), 100));

        return response()->json([
            'data' => $media->getCollection()->map(fn (Media $item) => $this->present($item))->values(),
            'meta' => ['current_page' => $media->currentPage(), 'last_page' => $media->lastPage(), 'total' => $media->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('media.upload'), 403);
        $data = $request->validate([
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:10240'],
            'alt_text' => ['required', 'string', 'min:3', 'max:300'],
            'caption' => ['nullable', 'string', 'max:2000'],
        ]);

        $path = $data['file']->store('media', 'public');
        if (! $path) {
            abort(500, 'Không thể lưu tệp lên thư viện ảnh.');
        }

        $media = Media::create([
            'disk' => 'public',
            'path' => $path,
            'original_name' => basename($data['file']->getClientOriginalName()),
            'mime_type' => $data['file']->getMimeType(),
            'size_bytes' => $data['file']->getSize(),
            'alt_text' => $data['alt_text'],
            'caption' => $data['caption'] ?? null,
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->present($media)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('media.update'), 403);
        $media = Media::query()->findOrFail($id);
        $data = $request->validate([
            'alt_text' => ['required', 'string', 'min:3', 'max:300'],
            'caption' => ['nullable', 'string', 'max:2000'],
        ]);
        $media->update($data);

        return response()->json(['data' => $this->present($media->refresh())]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->can('media.delete'), 403);
        $media = Media::query()->findOrFail($id);
        abort_if($media->disk === 'legacy', 422, 'Ảnh di sản không thể xóa từ thư viện CMS.');
        abort_if($this->isReferenced($media), 409, 'Ảnh đang được nội dung hoặc bản sửa đổi sử dụng.');

        if (Storage::disk($media->disk)->exists($media->path)
            && ! Storage::disk($media->disk)->delete($media->path)) {
            abort(500, 'Không thể xóa tệp khỏi thư viện ảnh.');
        }
        $media->delete();

        return response()->json(['message' => 'Đã xóa ảnh.']);
    }

    private function isReferenced(Media $media): bool
    {
        $markers = array_filter([$media->path, $media->url]);
        foreach ([Post::class, Product::class, Page::class, Faq::class, MenuItem::class, SiteSetting::class] as $model) {
            foreach ($model::query()->get() as $record) {
                $serialized = (string) json_encode($record->toArray(), JSON_INVALID_UTF8_SUBSTITUTE);
                foreach ($markers as $marker) {
                    if ($marker !== '' && str_contains($serialized, $marker)) {
                        return true;
                    }
                }
            }
        }

        foreach (ContentRevision::query()->get(['payload']) as $revision) {
            $serialized = (string) json_encode($revision->payload, JSON_INVALID_UTF8_SUBSTITUTE);
            foreach ($markers as $marker) {
                if ($marker !== '' && str_contains($serialized, $marker)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function present(Media $media): array
    {
        return [
            'id' => $media->id,
            'url' => $media->url,
            'path' => $media->path,
            'original_name' => $media->original_name,
            'mime_type' => $media->mime_type,
            'size_bytes' => $media->size_bytes,
            'alt_text' => $media->alt_text,
            'caption' => $media->caption,
            'created_at' => $media->created_at,
        ];
    }
}
