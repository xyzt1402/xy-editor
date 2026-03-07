/**
 * DOCX parser using mammoth.
 * @package @xy-editor/file-ingestion
 * @module parsers/docx
 */

import type { Parser, RawContent, RawBlock, FileMeta } from '../types';

/**
 * Parses HTML into RawBlocks using DOMParser.
 */
function parseHtmlToBlocks(html: string): RawBlock[] {
    const blocks: RawBlock[] = [];

    // Create a DOMParser in browser environment
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Get all block-level elements
    const elements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, pre, hr');

    for (const element of elements) {
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent?.trim() || '';

        if (!text) continue;

        switch (tagName) {
            case 'h1':
                blocks.push({ type: 'heading', level: 1, text });
                break;
            case 'h2':
                blocks.push({ type: 'heading', level: 2, text });
                break;
            case 'h3':
                blocks.push({ type: 'heading', level: 3, text });
                break;
            case 'h4':
                blocks.push({ type: 'heading', level: 4, text });
                break;
            case 'h5':
                blocks.push({ type: 'heading', level: 5, text });
                break;
            case 'h6':
                blocks.push({ type: 'heading', level: 6, text });
                break;
            case 'pre':
            case 'code':
                blocks.push({ type: 'code', text });
                break;
            case 'hr':
                blocks.push({ type: 'hr', text: '' });
                break;
            case 'li':
                blocks.push({ type: 'list-item', text });
                break;
            case 'p':
            default:
                blocks.push({ type: 'paragraph', text });
                break;
        }
    }

    // If no blocks were created but there's content, create a paragraph
    if (blocks.length === 0 && doc.body.textContent?.trim()) {
        blocks.push({ type: 'paragraph', text: doc.body.textContent.trim() });
    }

    return blocks;
}

/**
 * DOCX Parser implementation.
 * Converts DOCX files to HTML using mammoth, then parses to RawBlocks.
 */
export class DocxParser implements Parser {
    mimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    extensions = ['docx'];

    /**
     * Parses a DOCX file and returns raw content.
     * @param file - The DOCX file to parse
     * @returns Promise resolving to raw content
     */
    async parse(file: File): Promise<RawContent> {
        const arrayBuffer = await file.arrayBuffer();

        // Dynamically import mammoth
        const mammoth = await import('mammoth');

        // Convert DOCX to HTML
        const result = await mammoth.convertToHtml({ arrayBuffer });

        if (result.messages && result.messages.length > 0) {
            console.warn('DOCX parsing warnings:', result.messages);
        }

        // Parse HTML to blocks
        const blocks = parseHtmlToBlocks(result.value);

        const meta: FileMeta = {
            filename: file.name,
            mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: file.size,
            lastModified: file.lastModified,
            extension: 'docx',
        };

        return {
            blocks,
            meta,
        };
    }
}

// Export singleton instance for convenience
export const docxParser = new DocxParser();
