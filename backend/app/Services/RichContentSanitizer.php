<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;
use RuntimeException;

class RichContentSanitizer
{
    private const ALLOWED_TAGS = [
        'a', 'blockquote', 'br', 'code', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'img', 'li', 'ol', 'p', 'pre', 's', 'strong', 'table', 'tbody', 'td',
        'th', 'thead', 'tr', 'u', 'ul',
    ];

    private const REMOVED_TAGS = [
        'audio', 'base', 'button', 'canvas', 'embed', 'form', 'iframe', 'input', 'link',
        'math', 'meta', 'object', 'option', 'script', 'select', 'source', 'style',
        'svg', 'template', 'textarea', 'video',
    ];

    private const PAGE_RICH_TEXT_KEYS = [
        'body', 'body2',
    ];

    public function sanitizePayload(string $type, array $data): array
    {
        $field = match ($type) {
            'posts' => 'body',
            'products' => 'description',
            'faqs' => 'answer',
            default => null,
        };

        if ($field !== null && isset($data[$field]) && is_string($data[$field])) {
            $data[$field] = $this->sanitizeHtml($data[$field]);
        }

        if ($type === 'pages' && isset($data['content']) && is_array($data['content'])) {
            $data['content'] = $this->sanitizePageContent($data['content']);
        }

        return $data;
    }

    public function sanitizeHtml(string $html): string
    {
        if (! preg_match('/<\/?[a-z][^>]*>/i', $html)) {
            return $html;
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $previousErrorMode = libxml_use_internal_errors(true);

        try {
            $loaded = $document->loadHTML(
                '<?xml encoding="utf-8" ?><!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div data-rich-content-root="1">'.$html.'</div></body></html>',
                LIBXML_NONET | LIBXML_HTML_NODEFDTD,
            );

            if (! $loaded) {
                throw new RuntimeException('Không thể phân tích nội dung HTML.');
            }

            $root = (new DOMXPath($document))->query('//*[@data-rich-content-root="1"]')->item(0);
            if (! $root instanceof DOMElement) {
                throw new RuntimeException('Không thể tìm vùng nội dung HTML cần lọc.');
            }

            foreach (iterator_to_array($root->childNodes) as $child) {
                $this->sanitizeNode($child);
            }

            $sanitized = '';
            foreach ($root->childNodes as $child) {
                $sanitized .= $document->saveHTML($child);
            }

            return $sanitized;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previousErrorMode);
        }
    }

    private function sanitizePageContent(array $content): array
    {
        foreach ($content as $key => $value) {
            if (is_array($value)) {
                $content[$key] = $this->sanitizePageContent($value);
            } elseif (is_string($value) && in_array((string) $key, self::PAGE_RICH_TEXT_KEYS, true)) {
                $content[$key] = $this->sanitizeHtml($value);
            }
        }

        return $content;
    }

    private function sanitizeNode(DOMNode $node): void
    {
        if ($node->nodeType === XML_COMMENT_NODE || $node->nodeType === XML_PI_NODE) {
            $node->parentNode?->removeChild($node);

            return;
        }

        if ($node instanceof DOMElement) {
            $tag = strtolower($node->tagName);
            $parent = $node->parentNode;

            if (! in_array($tag, self::ALLOWED_TAGS, true)) {
                if ($parent === null) {
                    return;
                }

                if (in_array($tag, self::REMOVED_TAGS, true)) {
                    $parent->removeChild($node);
                } else {
                    $children = iterator_to_array($node->childNodes);
                    foreach ($children as $child) {
                        $parent->insertBefore($child, $node);
                    }
                    $parent->removeChild($node);
                    foreach ($children as $child) {
                        $this->sanitizeNode($child);
                    }
                }

                return;
            }

            $allowedAttributes = match ($tag) {
                'a' => ['href', 'rel', 'target', 'title'],
                'img' => ['alt', 'height', 'src', 'title', 'width'],
                'td', 'th' => ['colspan', 'rowspan'],
                default => [],
            };

            foreach (iterator_to_array($node->attributes) as $attribute) {
                $name = strtolower($attribute->name);
                $value = trim($attribute->value);

                if (! in_array($name, $allowedAttributes, true)) {
                    $node->removeAttribute($attribute->name);

                    continue;
                }

                if (in_array($name, ['href', 'src'], true) && ! $this->isSafeUrl($value, $name === 'src')) {
                    $node->removeAttribute($attribute->name);

                    continue;
                }

                if (in_array($name, ['width', 'height', 'colspan', 'rowspan'], true) && ! ctype_digit($value)) {
                    $node->removeAttribute($attribute->name);

                    continue;
                }

                if ($name === 'target' && ! in_array($value, ['_blank', '_self'], true)) {
                    $node->removeAttribute($attribute->name);
                }
            }

            if ($tag === 'a' && $node->getAttribute('target') === '_blank') {
                $node->setAttribute('rel', 'noopener noreferrer');
            }
        }

        foreach (iterator_to_array($node->childNodes) as $child) {
            $this->sanitizeNode($child);
        }
    }

    private function isSafeUrl(string $url, bool $isImage): bool
    {
        if ($url === '' || preg_match('/[\x00-\x1F\x7F]/', $url) || str_starts_with($url, '//') || str_starts_with($url, '\\\\')) {
            return false;
        }

        $scheme = parse_url($url, PHP_URL_SCHEME);
        if ($scheme === null) {
            return true;
        }

        $allowedSchemes = $isImage ? ['http', 'https'] : ['http', 'https', 'mailto', 'tel'];

        return in_array(strtolower($scheme), $allowedSchemes, true);
    }
}
