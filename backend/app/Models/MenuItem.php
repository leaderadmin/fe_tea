<?php

namespace App\Models;

use App\Models\Concerns\HasEditorialWorkflow;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    use HasEditorialWorkflow, HasFactory;

    protected array $publicationFields = ['label', 'url', 'target', 'sort_order', 'is_active'];

    protected $fillable = [
        'label', 'url', 'target', 'sort_order', 'is_active',
        'publication_status', 'published_slug', 'published_data', 'published_at', 'review_note',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'published_data' => 'array', 'published_at' => 'datetime'];
    }
}
