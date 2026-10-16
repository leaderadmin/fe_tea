<?php

namespace App\Models\Concerns;

use App\Models\ContentRevision;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

trait HasEditorialWorkflow
{
    public function revisions(): MorphMany
    {
        return $this->morphMany(ContentRevision::class, 'revisionable');
    }

    public function publicationFields(): array
    {
        return $this->publicationFields;
    }

    public function publicationPayload(): array
    {
        return $this->only($this->publicationFields());
    }

    public function publishedSnapshot(): ?array
    {
        $snapshot = $this->getAttribute('published_data');

        return $snapshot === null ? null : ['id' => $this->getKey(), ...$snapshot];
    }

    public function hasPendingRevision(): bool
    {
        return $this->revisions()->where('status', 'pending')->exists();
    }

    public function submitForReview(User $submitter): ContentRevision
    {
        return DB::transaction(function () use ($submitter): ContentRevision {
            $record = $this->newQuery()->lockForUpdate()->findOrFail($this->getKey());
            if ($record->hasPendingRevision()) {
                throw ValidationException::withMessages([
                    'publication' => 'Bản nháp này đang chờ admin duyệt.',
                ]);
            }

            $revision = $record->revisions()->create([
                'payload' => $record->publicationPayload(),
                'status' => 'pending',
                'submitted_by' => $submitter->id,
            ]);
            $record->forceFill(['publication_status' => 'pending_review'])->save();

            return $revision;
        });
    }

    public function publishRevision(array $payload): void
    {
        $publishedFields = array_intersect_key($payload, array_flip($this->publicationFields()));
        $scheduledFields = array_key_exists('scheduled_data', $this->getAttributes())
            ? ['scheduled_at' => null, 'scheduled_data' => null]
            : [];

        $this->forceFill([
            ...$publishedFields,
            ...$scheduledFields,
            'publication_status' => 'published',
            'published_slug' => $payload['slug'] ?? null,
            'published_data' => $payload,
            'published_at' => now(),
            'review_note' => null,
        ])->save();
    }

    public function approveRevision(array $payload): void
    {
        $this->publishRevision($payload);
    }
}
