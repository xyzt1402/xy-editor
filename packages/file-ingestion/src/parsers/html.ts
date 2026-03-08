/**
 * HTML parser — parses .html files directly.
 * @package @xy-editor/file-ingestion
 * @module parsers/html
 */

import type { Parser, RawContent } from '../types';
import { buildFileMeta, validateFile, parseHtmlToBlocks } from '../utils';

export class HtmlParser implements Parser {
    mimeTypes = ['text/html', 'application/xhtml+xml'];
    extensions = ['html', 'htm', 'xhtml'];

    async parse(file: File): Promise<RawContent> {
        validateFile(file);

        const html = await file.text();
        const blocks = parseHtmlToBlocks(html);

        return {
            blocks,
            meta: buildFileMeta(file, 'text/html'),
        };
    }
}

export const htmlParser = new HtmlParser();