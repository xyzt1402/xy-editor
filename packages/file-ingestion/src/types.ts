/**
 * Core types for the file-ingestion package.
 * @package @xy-editor/file-ingestion
 * @module types */

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
    level?: number;                      // headings: 1–6
    marks?: RawInlineMark[];             // inline formatting ranges
    data?: Record<string, unknown>;      // parser-specific extras (e.g. table cells, image src)
}

// ─── File Meta ────────────────────────────────────────────────────────────────
/**
 * Metadata about the source file.
 */
export interface FileMeta {
    filename: string;
    mimeType: string;
    size: number;
    lastModified: number;
    extension: string;
}

// ─── Raw Content ──────────────────────────────────────────────────────────────
/**
 * Raw content extracted from a file, consisting of multiple blocks.
 */
export interface RawContent {
    blocks: RawBlock[];
    meta: FileMeta;
}

// ─── Parser Interface ─────────────────────────────────────────────────────────

export interface Parser {
    /** MIME types this parser handles */
    mimeTypes: string[];
    /** File extensions this parser handles (lowercase, no dot) */
    extensions: string[];
    /** Parse a file into RawContent */
    parse(file: File): Promise<RawContent>;
}

// ─── Detection Result ─────────────────────────────────────────────────────────

export interface DetectionResult {
    parser: Parser;
    /** How the parser was matched */
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
    | 'UNSUPPORTED_TYPE';