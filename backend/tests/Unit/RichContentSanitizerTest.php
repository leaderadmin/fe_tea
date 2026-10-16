<?php

namespace Tests\Unit;

use App\Services\RichContentSanitizer;
use PHPUnit\Framework\TestCase;

class RichContentSanitizerTest extends TestCase
{
    private RichContentSanitizer $sanitizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->sanitizer = new RichContentSanitizer();
    }

    public function test_keeps_plain_text_and_allowed_formatting(): void
    {
        self::assertSame('Trà sạch, sao củi.', $this->sanitizer->sanitizeHtml('Trà sạch, sao củi.'));

        $sanitized = $this->sanitizer->sanitizeHtml('<p><strong>Trà ngon</strong></p><ul><li>Tuyển chọn</li></ul>');

        self::assertStringContainsString('<p><strong>Trà ngon</strong></p>', $sanitized);
        self::assertStringContainsString('<ul><li>Tuyển chọn</li></ul>', $sanitized);
    }

    public function test_removes_executable_markup_unsafe_urls_and_unapproved_attributes(): void
    {
        $sanitized = $this->sanitizer->sanitizeHtml(
            '<p onclick="alert(1)">Nội dung<script>alert(2)</script></p>'
            .'<a href="javascript:alert(3)" target="_blank" onclick="alert(4)">Liên kết</a>'
            .'<a href="https://example.com" target="_blank">Nguồn</a>'
            .'<img src="data:text/html,unsafe" onerror="alert(5)" alt="Trà">'
            .'<img src="https://example.com/tea.jpg" width="240px" height="120" alt="Trà">',
        );

        self::assertStringNotContainsString('<script', $sanitized);
        self::assertStringNotContainsString('onclick', $sanitized);
        self::assertStringNotContainsString('onerror', $sanitized);
        self::assertStringNotContainsString('javascript:', $sanitized);
        self::assertStringNotContainsString('data:text/html', $sanitized);
        self::assertStringContainsString('<p>Nội dung</p>', $sanitized);
        self::assertStringContainsString('href="https://example.com"', $sanitized);
        self::assertStringContainsString('rel="noopener noreferrer"', $sanitized);
        self::assertStringContainsString('src="https://example.com/tea.jpg"', $sanitized);
        self::assertStringNotContainsString('width="240px"', $sanitized);
        self::assertStringContainsString('height="120"', $sanitized);
    }

    public function test_sanitizes_only_rich_content_fields_in_payloads(): void
    {
        $post = $this->sanitizer->sanitizePayload('posts', [
            'title' => '<script>kept as title text</script>',
            'body' => '<p onmouseover="alert(1)">Post body</p>',
        ]);
        $page = $this->sanitizer->sanitizePayload('pages', [
            'content' => [
                'title' => '<script>not a rich-text field</script>',
                'sections' => [
                    ['body' => '<p onclick="alert(1)">Section body</p>'],
                    ['body2' => '<img src="javascript:alert(2)" alt="x">'],
                ],
            ],
        ]);

        self::assertSame('<script>kept as title text</script>', $post['title']);
        self::assertStringNotContainsString('onmouseover', $post['body']);
        self::assertStringContainsString('<p>Post body</p>', $post['body']);
        self::assertSame('<script>not a rich-text field</script>', $page['content']['title']);
        self::assertStringNotContainsString('onclick', $page['content']['sections'][0]['body']);
        self::assertStringNotContainsString('javascript:', $page['content']['sections'][1]['body2']);
    }
}
