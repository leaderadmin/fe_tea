<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_active')->default(true);
        });

        Schema::create('media', function (Blueprint $table): void {
            $table->id();
            $table->string('disk', 32)->default('public');
            $table->string('path')->unique();
            $table->string('original_name');
            $table->string('mime_type', 128);
            $table->unsignedBigInteger('size_bytes');
            $table->string('alt_text')->default('');
            $table->text('caption')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->string('type', 24)->index();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->unique(['type', 'slug']);
        });

        foreach (['posts', 'products', 'pages', 'faqs', 'menu_items', 'site_settings'] as $tableName) {
            Schema::create($tableName, function (Blueprint $table) use ($tableName): void {
                $table->id();
                if ($tableName === 'site_settings') {
                    $table->string('name')->unique();
                    $table->json('value');
                } elseif ($tableName === 'menu_items') {
                    $table->string('label');
                    $table->string('url', 2048);
                    $table->string('target', 16)->default('_self');
                    $table->unsignedInteger('sort_order')->default(0);
                    $table->boolean('is_active')->default(true);
                } elseif ($tableName === 'faqs') {
                    $table->string('question');
                    $table->text('answer');
                    $table->unsignedInteger('sort_order')->default(0);
                    $table->boolean('is_active')->default(true);
                } elseif ($tableName === 'pages') {
                    $table->string('slug')->unique();
                    $table->string('title');
                    $table->string('seo_title')->nullable();
                    $table->string('seo_description', 320)->nullable();
                    $table->json('content');
                } elseif ($tableName === 'posts') {
                    $table->string('slug')->unique();
                    $table->string('title');
                    $table->string('excerpt', 500)->nullable();
                    $table->longText('body');
                    $table->string('cover_url', 2048)->nullable();
                    $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
                    $table->string('seo_title')->nullable();
                    $table->string('seo_description', 320)->nullable();
                } else {
                    $table->string('slug')->unique();
                    $table->string('name');
                    $table->string('weight_label', 80)->nullable();
                    $table->text('description');
                    $table->string('tagline')->nullable();
                    $table->decimal('price', 12, 2)->nullable();
                    $table->string('currency', 3)->default('VND');
                    $table->string('photo_url', 2048)->nullable();
                    $table->json('gallery')->nullable();
                    $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
                    $table->string('seo_title')->nullable();
                    $table->string('seo_description', 320)->nullable();
                    $table->unsignedInteger('sort_order')->default(0);
                }

                $table->string('publication_status', 24)->default('draft')->index();
                $table->string('published_slug')->nullable()->unique();
                $table->json('published_data')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->text('review_note')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        Schema::create('content_revisions', function (Blueprint $table): void {
            $table->id();
            $table->morphs('revisionable');
            $table->json('payload');
            $table->string('status', 24)->default('pending')->index();
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_revisions');
        foreach (['site_settings', 'menu_items', 'faqs', 'pages', 'products', 'posts', 'categories', 'media'] as $tableName) {
            Schema::dropIfExists($tableName);
        }
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('is_active');
        });
    }
};
