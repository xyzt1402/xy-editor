/**
 * @xy-editor/file-ingestion - File ingestion functionality
 * 
 * This package converts uploaded files (PDF, DOCX, Markdown, CSV, plain text)
 * into an EditorState that can be used with xy-editor.
 * 
 * @package @xy-editor/file-ingestion
 * @module index
 */

import { detectParser } from './detector';
import { convertToEditorState } from './converters/rawToEditorState';
import { PlainTextParser } from './parsers/plaintext';

export type { RawBlock, RawContent, FileMeta, Parser, RawMark, RawBlockType } from './types';
export { convertToEditorState } from './converters/rawToEditorState';
export { detectParser, getAllParsers } from './detector';

// Re-export parsers for tree-shaking
export { PdfParser, pdfParser } from './parsers/pdf';
export { DocxParser, docxParser } from './parsers/docx';
export { MarkdownParser, markdownParser } from './parsers/markdown';
export { PlainTextParser, plainTextParser } from './parsers/plaintext';
export { CsvParser, csvParser } from './parsers/csv';

/**
 * Main entry point: ingests a file and returns an EditorState.
 * 
 * This function:
 * 1. Detects the appropriate parser based on MIME type and file extension
 * 2. Parses the file into raw content blocks
 * 3. Converts the raw content to an EditorState
 * 
 * If parsing fails, it falls back to PlainTextParser.
 * 
 * @param file - The file to ingest
 * @returns Promise resolving to an EditorState
 * 
 * @example
 * ```typescript
 * const file = input.files[0];
 * const state = await ingestFile(file);
 * // state is now ready to be used with the editor
 * ```
 */
export async function ingestFile(file: File): Promise<unknown> {
    try {
        // Detect the appropriate parser
        const parser = detectParser(file);

        // Parse the file
        const rawContent = await parser.parse(file);

        // Convert to EditorState
        const editorState = convertToEditorState(rawContent);

        return editorState;
    } catch (error) {
        console.error('Error ingesting file:', error);

        // Fallback to plain text parser
        try {
            const fallbackParser = new PlainTextParser();
            const rawContent = await fallbackParser.parse(file);
            return convertToEditorState(rawContent);
        } catch (fallbackError) {
            console.error('Fallback parsing also failed:', fallbackError);

            // Return an empty state as last resort
            const fallbackParser = new PlainTextParser();
            const rawContent = await fallbackParser.parse(new File(['Error: Could not parse file'], 'error.txt'));
            return convertToEditorState(rawContent);
        }
    }
}
