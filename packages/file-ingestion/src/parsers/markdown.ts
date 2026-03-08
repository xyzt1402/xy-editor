/**
 * Markdown parser using marked (lazy loaded).
 * @package @xy-editor/file-ingestion
 * @module parsers/markdown
 */

import type { Parser, RawContent, RawBlock } from '../types';
import { buildFileMeta, validateFile } from '../utils';
import type { Tokens, TokensList } from 'marked';

export class MarkdownParser implements Parser {
    mimeTypes = ['text/markdown', 'text/x-markdown'];
    extensions = ['md', 'mdx', 'markdown'];

    async parse(file: File): Promise<RawContent> {
        validateFile(file);

        const text = await file.text();

        // Lazy load marked — only loaded when a markdown file is opened
        const { marked, Lexer } = await import('marked');

        const tokens: TokensList = Lexer.lex(text);
        const blocks: RawBlock[] = [];


        for (const token of tokens) {
            switch (token.type) {
                case 'heading':
                    blocks.push({
                        type: 'heading',
                        level: token.depth,
                        text: token.text,
                    });
                    break;

                case 'paragraph':
                    blocks.push({ type: 'paragraph', text: token.text });
                    break;

                case 'list':
                    for (const item of token.items) {
                        blocks.push({ type: 'list-item', text: item.text });
                    }
                    break;

                case 'code':
                    blocks.push({
                        type: 'code',
                        text: token.text,
                        data: { lang: token.lang ?? '' },
                    });
                    break;

                case 'blockquote':
                    blocks.push({ type: 'blockquote', text: token.text });
                    break;

                case 'hr':
                    blocks.push({ type: 'hr', text: '' });
                    break;

                case 'table': {
                    // Cast to Tokens.Table — TypeScript can't narrow this automatically
                    const t = token as Tokens.Table;

                    const headerCells = t.header.map((h: Tokens.TableCell) => h.text);
                    blocks.push({
                        type: 'table-row',
                        text: headerCells.join('\t'),
                        data: { cells: headerCells, isHeader: true },
                    });

                    for (const row of t.rows) {
                        const cells = row.map((cell: Tokens.TableCell) => cell.text);
                        blocks.push({
                            type: 'table-row',
                            text: cells.join('\t'),
                            data: { cells },
                        });
                    }
                    break;
                }

                case 'space':
                    // Skip blank lines between blocks
                    break;

                default:
                    // Render unknown tokens to HTML as fallback
                    if ('raw' in token && token.raw.trim()) {
                        const html = await marked(token.raw);
                        if (html.trim()) {
                            blocks.push({ type: 'paragraph', text: token.raw.trim() });
                        }
                    }
            }
        }

        return {
            blocks,
            meta: buildFileMeta(file, 'text/markdown'),
        };
    }
}

export const markdownParser = new MarkdownParser();