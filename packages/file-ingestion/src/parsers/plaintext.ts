/**
 * Plain text parser.
 * @package @xy-editor/file-ingestion
 * @module parsers/plaintext
 */

import type { Parser, RawContent, RawBlock, FileMeta } from '../types';

/**
 * PlainText Parser implementation.
 * Splits on double newlines for paragraphs, single newlines as line breaks.
 */
export class PlainTextParser implements Parser {
    mimeTypes = [
        'text/plain',
        'text/html',
        'application/octet-stream',
        'text/css',
        'text/csv',
        'text/javascript',
    ];
    extensions = ['txt', 'text', 'log', 'ini', 'conf', 'cfg'];

    /**
     * Parses a plain text file and returns raw content.
     * @param file - The text file to parse
     * @returns Promise resolving to raw content
     */
    async parse(file: File): Promise<RawContent> {
        const text = await file.text();

        // Split on double newlines to get paragraphs
        const paragraphs = text.split(/\n\n+/);

        const blocks: RawBlock[] = [];

        for (const paragraph of paragraphs) {
            // Skip empty paragraphs
            if (!paragraph.trim()) continue;

            blocks.push({
                type: 'paragraph',
                text: paragraph.trim(),
            });
        }

        // If no blocks were created but there's content, create a single paragraph
        if (blocks.length === 0 && text.trim()) {
            blocks.push({
                type: 'paragraph',
                text: text.trim(),
            });
        }

        const meta: FileMeta = {
            filename: file.name,
            mimeType: file.type || 'text/plain',
            size: file.size,
            lastModified: file.lastModified,
            extension: 'txt',
        };

        return {
            blocks,
            meta,
        };
    }
}

// Export singleton instance for convenience
export const plainTextParser = new PlainTextParser();
