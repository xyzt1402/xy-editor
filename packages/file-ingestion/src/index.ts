/**
 * @package @xy-editor/file-ingestion
 *
 * Public API surface. Import from here, not from internal paths.
 *
 * @example
 * ```typescript
 * import { ingestFile, buildAcceptAttribute } from '@xy-editor/file-ingestion';
 *
 * const content = await ingestFile(file);
 * ```
 */

// ─── Main entry points ────────────────────────────────────────────────────────
export { detectParser, ingestFile, getSupportedFileTypes, buildAcceptAttribute } from './detector';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
    Parser,
    RawContent,
    RawBlock,
    RawBlockType,
    RawInlineMark,
    FileMeta,
    DetectionResult,
} from './types';

export { FileIngestionError } from './types';
export type { FileIngestionErrorCode } from './types';

// ─── Individual parsers (for tree-shaking / custom use) ───────────────────────
// These are NOT re-exported from the main bundle automatically.
// Import them directly if you need a specific parser without going through detectParser:
//
//   import { PdfParser } from '@xy-editor/file-ingestion/parsers/pdf'
//   import { DocxParser } from '@xy-editor/file-ingestion/parsers/docx'