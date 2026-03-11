/**
 * Core types for the file-ingestion package.
 * @package @xy-editor/file-ingestion
 * @module types
 *
 * CHANGE: Added 'CONVERT_FAILED' to FileIngestionErrorCode (BUG-11 fix).
 * This code is used when convertToEditorState throws — it is distinct from
 * 'PARSE_FAILED' which covers errors in the parser phase only.
 */

// ─── Raw Block Types ──────────────────────────────────────────────────────────

export type RawBlockType =
    | 'paragraph'
    | 'heading'
    | 'list-item'
    | 'table-row'
    | 'code'
    | 'hr'
    | 'blockquote'
    | 'image';

export interface RawInlineMark {
    type: string;
    start: number;
    end: number;
    attrs?: Record<string, unknown>;
}

export interface RawBlock {
    type: RawBlockType;
    text: string;
    level?: number;
    marks?: RawInlineMark[];
    data?: Record<string, unknown>;
}

// ─── File Meta ────────────────────────────────────────────────────────────────

export interface FileMeta {
    filename: string;
    mimeType: string;
    size: number;
    lastModified: number;
    extension: string;
}

// ─── Raw Content ──────────────────────────────────────────────────────────────

export interface RawContent {
    blocks: RawBlock[];
    meta: FileMeta;
}

// ─── Parser Interface ─────────────────────────────────────────────────────────

export interface Parser {
    mimeTypes: string[];
    extensions: string[];
    parse(file: File): Promise<RawContent>;
}

// ─── Detection Result ─────────────────────────────────────────────────────────

export interface DetectionResult {
    parser: Parser;
    matchedBy: 'mime' | 'extension' | 'fallback';
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class FileIngestionError extends Error {
    constructor(
        message: string,
        public readonly code: FileIngestionErrorCode,
        public readonly file?: File,
    ) {
        super(message);
        this.name = 'FileIngestionError';
    }
}

export type FileIngestionErrorCode =
    | 'FILE_EMPTY'
    | 'FILE_TOO_LARGE'
    | 'PARSE_FAILED'
    | 'CONVERT_FAILED'
    | 'UNSUPPORTED_TYPE';