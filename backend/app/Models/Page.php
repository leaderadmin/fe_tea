<?php

namespace App\Models;

use App\Models\Concerns\HasEditorialWorkflow;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasEditorialWorkflow, HasFactory;

    protected array $publicationFields = ['slug', 'title', 'seo_title', 'seo_description', 'content'];

    protected $fillable = [
        'slug', 'title', 'seo_title', 'seo_description', 'content',
        'publication_status', 'published_slug', 'published_data', 'published_at', 'review_note',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'published_data' => 'array',
            'published_at' => 'datetime',
        ];
    }
}
