/**
 * File type detection for parser selection.
 * @package @xy-editor/file-ingestion
 * @module detector
 *
 */

import { convertToEditorState } from './converters/rawToEditorState';
import type { DetectionResult } from './types';
import { FileIngestionError } from './types';
import type { EditorState } from '@xy-editor/core';
import { getExtension, validateFile } from './utils';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates the file and returns the appropriate parser for it.
 *
 * All imports are dynamic so heavy parser dependencies (pdfjs-dist, mammoth)
 * are only downloaded when actually needed.
 *
 * @throws {FileIngestionError} FILE_EMPTY | FILE_TOO_LARGE | UNSUPPORTED_TYPE
 */
export async function detectParser(file: File): Promise<DetectionResult> {
    validateFile(file);

    const mimeType = file.type?.toLowerCase() ?? '';
    const extension = getExtension(file.name);

    const is = (mimes: string[], exts: string[]) =>
        mimes.includes(mimeType) || exts.includes(extension);

    switch (true) {
        case is(['application/pdf'], ['pdf']): {
            const { PdfParser } = await import('./parsers/pdf');
            return { parser: new PdfParser(), matchedBy: mimeType ? 'mime' : 'extension' };
        }

        case is([
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ], ['docx', 'doc']): {
                const { DocxParser } = await import('./parsers/docx');
                return { parser: new DocxParser(), matchedBy: mimeType ? 'mime' : 'extension' };
            }

        case is(['application/vnd.oasis.opendocument.text'], ['odt']): {
            console.warn('[detector] ODT support is limited — falling back to plain text.');
            const { PlainTextParser } = await import('./parsers/plaintext');
            return { parser: new PlainTextParser(), matchedBy: mimeType ? 'mime' : 'extension' };
        }

        case is(['application/rtf', 'text/rtf'], ['rtf']): {
            const { RtfParser } = await import('./parsers/rtf');
            return { parser: new RtfParser(), matchedBy: mimeType ? 'mime' : 'extension' };
        }

        case is(['text/markdown', 'text/x-markdown'], ['md', 'mdx', 'markdown']): {
            const { MarkdownParser } = await import('./parsers/markdown');
            return { parser: new MarkdownParser(), matchedBy: mimeType ? 'mime' : 'extension' };
        }

        case is([
            'text/csv',
            'text/tab-separated-values',
            'application/csv',
            'application/vnd.ms-excel',
        ], ['csv', 'tsv']): {
                const { CsvParser } = await import('./parsers/csv');
                return { parser: new CsvParser(), matchedBy: mimeType ? 'mime' : 'extension' };
            }

        case is(['text/html', 'application/xhtml+xml'], ['html', 'htm', 'xhtml']): {
            const { HtmlParser } = await import('./parsers/html');
            return { parser: new HtmlParser(), matchedBy: mimeType ? 'mime' : 'extension' };
        }

        case is(['application/json', 'text/json'], ['json']):
        case is(['text/xml', 'application/xml'], ['xml']):
        case mimeType.startsWith('text/'): {
            const { PlainTextParser } = await import('./parsers/plaintext');
            return { parser: new PlainTextParser(), matchedBy: mimeType ? 'mime' : 'extension' };
        }

        default: {
            if (mimeType.startsWith('text/') || mimeType === '') {
                const { PlainTextParser } = await import('./parsers/plaintext');
                return { parser: new PlainTextParser(), matchedBy: 'fallback' };
            }

            throw new FileIngestionError(
                `"${file.name}" is not a supported file type. Supported formats: PDF, DOCX, MD, CSV, HTML, RTF, TXT.`,
                'UNSUPPORTED_TYPE',
                file,
            );
        }
    }
}

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Detect and immediately parse a file, then convert to EditorState.
 *
 * BUG-11 fix: split into two distinct error phases so parser errors and
 * converter errors are classified independently and carry the correct code.
 *
 * @throws {FileIngestionError} FILE_EMPTY | FILE_TOO_LARGE | UNSUPPORTED_TYPE
 *                              | PARSE_FAILED | CONVERT_FAILED
 */
export async function ingestFile(file: File): Promise<EditorState> {
    // ── Phase 1: detect + parse (errors → PARSE_FAILED) ──────────────────────
    let rawContent;
    try {
        const { parser } = await detectParser(file);
        rawContent = await parser.parse(file);
    } catch (error) {
        // Re-throw FileIngestionErrors unchanged (FILE_EMPTY, FILE_TOO_LARGE,
        // UNSUPPORTED_TYPE already have the correct code)
        if (error instanceof FileIngestionError) throw error;

        throw new FileIngestionError(
            `Failed to parse "${file.name}": ${error instanceof Error ? error.message : String(error)
            }`,
            'PARSE_FAILED',
            file,
        );
    }

    // ── Phase 2: convert RawContent → EditorState (errors → CONVERT_FAILED) ──
    try {
        return convertToEditorState(rawContent);
    } catch (error) {
        throw new FileIngestionError(
            `Failed to convert "${file.name}" to editor state: ${error instanceof Error ? error.message : String(error)
            }`,
            'CONVERT_FAILED',
            file,
        );
    }
}

// ─── Supported types listing (for UI) ────────────────────────────────────────

export interface SupportedFileType {
    label: string;
    mimeTypes: string[];
    extensions: string[];
}

export function getSupportedFileTypes(): SupportedFileType[] {
    return [
        {
            label: 'PDF',
            mimeTypes: ['application/pdf'],
            extensions: ['pdf'],
        },
        {
            label: 'Word Document',
            mimeTypes: [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
            ],
            extensions: ['docx', 'doc'],
        },
        {
            label: 'Rich Text Format',
            mimeTypes: ['application/rtf', 'text/rtf'],
            extensions: ['rtf'],
        },
        {
            label: 'Markdown',
            mimeTypes: ['text/markdown', 'text/x-markdown'],
            extensions: ['md', 'mdx', 'markdown'],
        },
        {
            label: 'CSV / TSV',
            mimeTypes: ['text/csv', 'text/tab-separated-values'],
            extensions: ['csv', 'tsv'],
        },
        {
            label: 'HTML',
            mimeTypes: ['text/html'],
            extensions: ['html', 'htm'],
        },
        {
            label: 'Plain Text',
            mimeTypes: ['text/plain'],
            extensions: ['txt', 'text', 'log'],
        },
        {
            label: 'JSON',
            mimeTypes: ['application/json'],
            extensions: ['json'],
        },
    ];
}

export function buildAcceptAttribute(): string {
    return getSupportedFileTypes()
        .flatMap((t) => [...t.mimeTypes, ...t.extensions.map((e) => `.${e}`)])
        .join(',');
}