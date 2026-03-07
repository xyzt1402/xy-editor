/**
 * Markdown parser using marked.
 * @package @xy-editor/file-ingestion
 * @module parsers/markdown
 */

import type { Parser, RawContent, RawBlock, FileMeta } from '../types';

/**
 * Converts marked tokens to RawBlocks.
 */
function tokensToBlocks(tokens: Array<{
    type: string;
    text?: string;
    depth?: number;
    raw?: string;
}>): RawBlock[] {
    const blocks: RawBlock[] = [];

    for (const token of tokens) {
        switch (token.type) {
            case 'heading':
                blocks.push({
                    type: 'heading',
                    level: token.depth ?? 1,
                    text: token.text ?? '',
                });
                break;

            case 'paragraph':
                blocks.push({
                    type: 'paragraph',
                    text: token.text ?? '',
                });
                break;

            case 'list':
                // Handle list items
                const items = (token as any).items || [];
                for (const item of items) {
                    blocks.push({
                        type: 'list-item',
                        text: item.text ?? '',
                    });
                }
                break;

            case 'code':
                blocks.push({
                    type: 'code',
                    text: token.text ?? '',
                    data: { raw: token.raw },
                });
                break;

            case 'hr':
                blocks.push({
                    type: 'hr',
                    text: '',
                });
                break;

            case 'table':
                // Handle table rows
                const rows = (token as any).rows || [];
                for (const row of rows) {
                    const cells = row.map((cell: any) => cell.text ?? '').join(' | ');
                    blocks.push({
                        type: 'table-row',
                        text: cells,
                    });
                }
                break;

            case 'blockquote':
                // Convert blockquote to paragraph with indentation hint
                blocks.push({
                    type: 'paragraph',
                    text: token.text ?? '',
                });
                break;

            default:
                // Skip unknown tokens
                break;
        }
    }

    return blocks;
}

/**
 * Markdown Parser implementation.
 * Parses Markdown files using marked.lexer().
 */
export class MarkdownParser implements Parser {
    mimeTypes = [
        'text/markdown',
        'text/x-markdown',
        'application/json', // Sometimes used for MD files
    ];
    extensions = ['md', 'markdown', 'mdown', 'mkd'];

    /**
     * Parses a Markdown file and returns raw content.
     * @param file - The Markdown file to parse
     * @returns Promise resolving to raw content
     */
    async parse(file: File): Promise<RawContent> {
        const text = await file.text();

        // Dynamically import marked
        const marked = await import('marked');

        // Use lexer to get token stream
        const tokens = marked.lexer(text);

        // Convert tokens to blocks
        const blocks = tokensToBlocks(tokens);

        const meta: FileMeta = {
            filename: file.name,
            mimeType: file.type || 'text/markdown',
            size: file.size,
            lastModified: file.lastModified,
            extension: 'md',
        };

        return {
            blocks,
            meta,
        };
    }
}

// Export singleton instance for convenience
export const markdownParser = new MarkdownParser();
