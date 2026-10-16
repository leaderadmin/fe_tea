<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    protected $fillable = ['disk', 'path', 'original_name', 'mime_type', 'size_bytes', 'alt_text', 'caption', 'uploaded_by'];

    protected function casts(): array
    {
        return ['size_bytes' => 'integer'];
    }

    public function getUrlAttribute(): string
    {
        return $this->disk === 'legacy'
            ? '/'.$this->path
            : Storage::disk($this->disk)->url($this->path);
    }
}
