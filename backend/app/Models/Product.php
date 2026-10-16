<?php

namespace App\Models;

use App\Models\Concerns\HasEditorialWorkflow;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasEditorialWorkflow, HasFactory;

    protected array $publicationFields = [
        'slug', 'name', 'weight_label', 'description', 'tagline', 'price', 'currency',
        'photo_url', 'gallery', 'category_id', 'seo_title', 'seo_description', 'sort_order',
    ];

    protected $fillable = [
        'slug', 'name', 'weight_label', 'description', 'tagline', 'price', 'currency',
        'photo_url', 'gallery', 'category_id', 'seo_title', 'seo_description', 'sort_order',
        'publication_status', 'published_slug', 'published_data', 'published_at', 'review_note',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'gallery' => 'array',
            'published_data' => 'array',
            'published_at' => 'datetime',
            'price' => 'decimal:2',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
