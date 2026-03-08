/**
 * RTF parser — strips RTF control words and extracts plain text.
 * @package @xy-editor/file-ingestion
 * @module parsers/rtf
 *
 * Note: Full RTF formatting preservation requires a dedicated library.
 * This parser extracts readable text content without full format fidelity,
 * which is sufficient for the editor ingestion use case.
 */

import type { Parser, RawContent } from '../types';
import { buildFileMeta, validateFile } from '../utils';
import { parsePlainText } from './plaintext-utils';

export class RtfParser implements Parser {
    mimeTypes = ['application/rtf', 'text/rtf'];
    extensions = ['rtf'];

    async parse(file: File): Promise<RawContent> {
        validateFile(file);

        const raw = await file.text();
        const plainText = stripRtf(raw);
        const blocks = parsePlainText(plainText);

        return {
            blocks,
            meta: buildFileMeta(file, 'application/rtf'),
        };
    }
}

// ─── RTF Stripping ────────────────────────────────────────────────────────────

/**
 * Strips RTF markup and returns readable plain text.
 *
 * Handles:
 * - Control words (\word, \word123)
 * - Control symbols (\*)
 * - Groups ({ ... })
 * - Unicode escapes (\uN?)
 * - Hex escapes (\'XX)
 * - Common special characters (\par, \line, \tab)
 */
function stripRtf(rtf: string): string {
    // Remove the RTF header and binary data markers
    let text = rtf;

    // Replace paragraph marks with double newline (paragraph break)
    text = text.replace(/\\par\b/g, '\n\n');
    // Replace line breaks with single newline
    text = text.replace(/\\line\b/g, '\n');
    // Replace tabs
    text = text.replace(/\\tab\b/g, '\t');

    // Replace Unicode escapes \uN? (N is decimal codepoint, ? is fallback char)
    text = text.replace(/\\u(-?\d+)\??/g, (_, code) => {
        const n = parseInt(code, 10);
        // RTF uses signed 16-bit; negative values wrap around
        const codePoint = n < 0 ? n + 65536 : n;
        try {
            return String.fromCodePoint(codePoint);
        } catch {
            return '';
        }
    });

    // Replace hex escapes \'XX
    text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );

    // Replace common special character control words
    const specialChars: Record<string, string> = {
        '\\~': '\u00A0',   // non-breaking space
        '\\-': '\u00AD',   // soft hyphen
        '\\_': '-',        // non-breaking hyphen
        '\\{': '{',
        '\\}': '}',
        '\\\\': '\\',
        '\\bullet': '•',
        '\\emdash': '—',
        '\\endash': '–',
        '\\lquote': '\u2018',
        '\\rquote': '\u2019',
        '\\ldblquote': '\u201C',
        '\\rdblquote': '\u201D',
    };

    for (const [rtfSeq, replacement] of Object.entries(specialChars)) {
        text = text.replaceAll(rtfSeq, replacement);
    }

    // Remove all remaining control words and their optional numeric parameters
    text = text.replace(/\\[a-zA-Z]+[-]?\d*\s?/g, '');
    // Remove control symbols (single non-alpha char after backslash)
    text = text.replace(/\\[^a-zA-Z]/g, '');
    // Remove group braces
    text = text.replace(/[{}]/g, '');

    // Collapse excessive whitespace while preserving paragraph breaks
    text = text
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return text;
}

export const rtfParser = new RtfParser();