/**
 * DOCX parser using mammoth (lazy loaded).
 * @package @xy-editor/file-ingestion
 * @module parsers/docx
 */

import type { Parser, RawContent } from '../types';
import { buildFileMeta, validateFile, parseHtmlToBlocks } from '../utils';

export class DocxParser implements Parser {
    mimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword', // .doc legacy — mammoth handles both
    ];
    extensions = ['docx', 'doc'];

    async parse(file: File): Promise<RawContent> {
        validateFile(file);

        const arrayBuffer = await file.arrayBuffer();

        // Lazy load mammoth — ~500KB, only loaded when a DOCX is opened
        const mammoth = await import('mammoth');

        const result = await mammoth.convertToHtml({ arrayBuffer });

        if (result.messages.length > 0) {
            // Log warnings but don't fail — mammoth recovers gracefully
            console.warn('[DocxParser] mammoth warnings:', result.messages);
        }

        const blocks = parseHtmlToBlocks(result.value);

        return {
            blocks,
            meta: buildFileMeta(
                file,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ),
        };
    }
}

export const docxParser = new DocxParser();