/**
 * Shared utilities for file-ingestion parsers.
 * @package @xy-editor/file-ingestion
 * @module utils
 */

import type { FileMeta } from './types';
import { FileIngestionError } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ─── File Extension ───────────────────────────────────────────────────────────

/**
 * Extracts the file extension from a filename or path.
 *
 * Handles edge cases:
 * - Dotfiles (.gitignore → '')
 * - Paths (/foo/bar/file.txt → 'txt')
 * - Compound extensions (file.tar.gz → 'gz')
 * - No extension (file → '')
 */
export function getExtension(filename: string): string {
    // Strip directory path if present
    const base = filename.split('/').pop() ?? filename;

    // Dotfiles like .gitignore have no real extension
    if (base.startsWith('.') && !base.slice(1).includes('.')) {
        return '';
    }

    const dotIndex = base.lastIndexOf('.');
    return dotIndex > 0 ? base.slice(dotIndex + 1).toLowerCase() : '';
}

// ─── File Meta Builder ────────────────────────────────────────────────────────

/**
 * Builds a FileMeta object from a File, with MIME fallback.
 */
export function buildFileMeta(file: File, mimeTypeFallback?: string): FileMeta {
    return {
        filename: file.name,
        mimeType: file.type || mimeTypeFallback || 'application/octet-stream',
        size: file.size,
        lastModified: file.lastModified,
        extension: getExtension(file.name),
    };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates a file before parsing.
 * Throws FileIngestionError with a specific code on failure.
 */
export function validateFile(file: File, maxSize = MAX_FILE_SIZE): void {
    if (file.size === 0) {
        throw new FileIngestionError(
            `File "${file.name}" is empty.`,
            'FILE_EMPTY',
            file,
        );
    }

    if (file.size > maxSize) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        const maxMb = (maxSize / 1024 / 1024).toFixed(0);
        throw new FileIngestionError(
            `File "${file.name}" is ${mb}MB, which exceeds the ${maxMb}MB limit.`,
            'FILE_TOO_LARGE',
            file,
        );
    }
}

// ─── HTML Parsing ─────────────────────────────────────────────────────────────

/**
 * Parses an HTML string into RawBlocks using DOMParser.
 * Shared between DocxParser and HtmlParser.
 */
import type { RawBlock } from './types';

export function parseHtmlToBlocks(html: string): RawBlock[] {
    const blocks: RawBlock[] = [];
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(html, 'text/html');

    // Walk top-level block elements only (avoids double-counting nested li > p etc.)
    const elements = doc.body.querySelectorAll(
        ':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > li, :scope > pre, :scope > hr, :scope > blockquote, :scope > ul > li, :scope > ol > li, table tr'
    );

    for (const el of elements) {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent?.trim() ?? '';

        // Skip completely empty non-hr elements
        if (!text && tag !== 'hr') continue;

        switch (tag) {
            case 'h1': blocks.push({ type: 'heading', level: 1, text }); break;
            case 'h2': blocks.push({ type: 'heading', level: 2, text }); break;
            case 'h3': blocks.push({ type: 'heading', level: 3, text }); break;
            case 'h4': blocks.push({ type: 'heading', level: 4, text }); break;
            case 'h5': blocks.push({ type: 'heading', level: 5, text }); break;
            case 'h6': blocks.push({ type: 'heading', level: 6, text }); break;
            case 'pre': blocks.push({ type: 'code', text }); break;
            case 'hr': blocks.push({ type: 'hr', text: '' }); break;
            case 'li': blocks.push({ type: 'list-item', text }); break;
            case 'blockquote': blocks.push({ type: 'blockquote', text }); break;
            case 'tr': {
                // Collect cell text as tab-separated, store cells in data
                const cells = Array.from(el.querySelectorAll('td, th')).map(
                    td => td.textContent?.trim() ?? ''
                );
                blocks.push({
                    type: 'table-row',
                    text: cells.join('\t'),
                    data: { cells },
                });
                break;
            }
            default:
                blocks.push({ type: 'paragraph', text });
        }
    }

    // Fallback: if DOMParser found body text but no matching elements
    if (blocks.length === 0) {
        const fallback = doc.body.textContent?.trim();
        if (fallback) {
            blocks.push({ type: 'paragraph', text: fallback });
        }
    }

    return blocks;
}