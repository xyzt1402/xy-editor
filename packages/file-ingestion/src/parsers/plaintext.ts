/**
 * Plain text parser — the universal fallback.
 * @package @xy-editor/file-ingestion
 * @module parsers/plaintext
 */

import type { Parser, RawContent } from '../types';
import { buildFileMeta, validateFile } from '../utils';
import { parsePlainText } from './plaintext-utils';

export class PlainTextParser implements Parser {
    mimeTypes = ['text/plain'];
    extensions = ['txt', 'text', 'log', 'env'];

    async parse(file: File): Promise<RawContent> {
        validateFile(file);
        const text = await file.text();
        const blocks = parsePlainText(text);
        return { blocks, meta: buildFileMeta(file, 'text/plain') };
    }
}

export const plainTextParser = new PlainTextParser();