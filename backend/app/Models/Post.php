<?php

namespace App\Models;

use App\Models\Concerns\HasEditorialWorkflow;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Post extends Model
{
    use HasEditorialWorkflow, HasFactory;

    protected array $publicationFields = [
        'slug', 'title', 'excerpt', 'body', 'cover_url', 'category_id', 'seo_title', 'seo_description', 'scheduled_at',
    ];

    protected $fillable = [
        'slug', 'title', 'excerpt', 'body', 'cover_url', 'category_id', 'seo_title', 'seo_description',
        'publication_status', 'published_slug', 'published_data', 'published_at', 'review_note', 'scheduled_at', 'scheduled_data',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['published_data' => 'array', 'published_at' => 'datetime', 'scheduled_data' => 'array', 'scheduled_at' => 'datetime'];
    }

    public function approveRevision(array $payload): void
    {
        $scheduledAt = isset($payload['scheduled_at']) ? Carbon::parse($payload['scheduled_at']) : null;

        if ($scheduledAt?->isFuture()) {
            $this->forceFill([
                'scheduled_at' => $scheduledAt,
                'scheduled_data' => $payload,
                'publication_status' => 'scheduled',
                'review_note' => null,
            ])->save();

            return;
        }

        $this->publishRevision($payload);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
