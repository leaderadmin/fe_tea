<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\PublicContentCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PublishScheduledPosts extends Command
{
    protected $signature = 'cms:publish-scheduled-posts';

    protected $description = 'Publish approved posts whose scheduled time has arrived';

    public function handle(PublicContentCache $cache): int
    {
        $publishedCount = 0;

        Post::query()
            ->where('publication_status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->orderBy('id')
            ->chunkById(100, function ($posts) use ($cache, &$publishedCount): void {
                foreach ($posts as $candidate) {
                    DB::transaction(function () use ($candidate, $cache, &$publishedCount): void {
                        $post = Post::query()->lockForUpdate()->find($candidate->id);
                        if (! $post
                            || $post->publication_status !== 'scheduled'
                            || ! $post->scheduled_at?->lte(now())) {
                            return;
                        }

                        $payload = $post->scheduled_data;
                        if (! is_array($payload)) {
                            throw new RuntimeException("Scheduled post {$post->id} is missing its approved payload.");
                        }

                        $previous = $post->published_data;
                        $post->publishRevision($payload);
                        $cache->forgetPublished('Post', $previous, $payload);
                        $publishedCount++;
                    });
                }
            });

        $this->info("Published {$publishedCount} scheduled post(s).");

        return self::SUCCESS;
    }
}
