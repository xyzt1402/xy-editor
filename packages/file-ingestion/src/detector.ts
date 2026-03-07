/**
 * File type detection for parser selection.
 * @package @xy-editor/file-ingestion
 * @module detector
 */

import type { Parser } from './types';
import { PdfParser } from './parsers/pdf';
import { DocxParser } from './parsers/docx';
import { MarkdownParser } from './parsers/markdown';
import { PlainTextParser } from './parsers/plaintext';
import { CsvParser } from './parsers/csv';

/**
 * Registry of all available parsers.
 * Priority: MIME type first, then file extension.
 */
const parsers: Parser[] = [
    new PdfParser(),
    new DocxParser(),
    new MarkdownParser(),
    new CsvParser(),
    new PlainTextParser(),
];

/**
 * Gets the file extension from a filename.
 */
function getExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length > 1) {
        const ext = parts[parts.length - 1];
        return ext ? ext.toLowerCase() : '';
    }
    return '';
}

/**
 * Detects the appropriate parser for a file based on MIME type and extension.
 * 
 * Priority:
 * 1. MIME type match
 * 2. Extension match
 * 3. Default to PlainTextParser as fallback
 * 
 * @param file - The file to detect the type for
 * @returns The appropriate Parser for the file
 * 
 * @example
 * ```typescript
 * const parser = detectParser(file);
 * const content = await parser.parse(file);
 * ```
 */
export function detectParser(file: File): Parser {
    const mimeType = file.type?.toLowerCase() || '';
    const extension = getExtension(file.name);

    // First, try to match by MIME type
    if (mimeType) {
        const mimeMatch = parsers.find(p =>
            p.mimeTypes.some(m => m.toLowerCase() === mimeType)
        );
        if (mimeMatch) {
            return mimeMatch;
        }
    }

    // Then, try to match by extension
    if (extension) {
        const extMatch = parsers.find(p =>
            p.extensions.some(e => e.toLowerCase() === extension)
        );
        if (extMatch) {
            return extMatch;
        }
    }

    // Special handling for known MIME types that might not match exactly
    if (mimeType.startsWith('text/')) {
        // Could be markdown or plain text
        const textMatch = parsers.find(p =>
            p.mimeTypes.some(m => m.startsWith('text/'))
        );
        if (textMatch) {
            return textMatch;
        }
    }

    // Fallback to plain text parser
    return new PlainTextParser();
}

/**
 * Gets all available parsers.
 */
export function getAllParsers(): Parser[] {
    return [...parsers];
}
