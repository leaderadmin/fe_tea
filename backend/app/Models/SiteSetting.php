<?php

namespace App\Models;

use App\Models\Concerns\HasEditorialWorkflow;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    use HasEditorialWorkflow, HasFactory;

    protected array $publicationFields = ['name', 'value'];

    protected $fillable = [
        'name', 'value',
        'publication_status', 'published_slug', 'published_data', 'published_at', 'review_note',
        'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['value' => 'array', 'published_data' => 'array', 'published_at' => 'datetime'];
    }
}
