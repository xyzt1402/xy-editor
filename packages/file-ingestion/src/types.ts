/**
 * Type definitions for file ingestion functionality.
 * @package @xy-editor/file-ingestion
 * @module types
 */

/**
 * Represents a mark applied to a range of text within a block.
 */
export interface RawMark {
    /** The type of mark (e.g., 'bold', 'italic', 'code') */
    type: string;
    /** Start position of the mark (0-based) */
    start: number;
    /** End position of the mark (0-based, exclusive) */
    end: number;
    /** Optional attributes for the mark */
    attrs?: Record<string, unknown>;
}

/**
 * Types of raw blocks that can be parsed from files.
 */
export type RawBlockType =
    | 'paragraph'
    | 'heading'
    | 'list-item'
    | 'table-row'
    | 'code'
    | 'hr';

/**
 * Represents a single block of content extracted from a file.
 * This is an intermediate representation before converting to EditorNode.
 */
export interface RawBlock {
    /** The type of block */
    type: RawBlockType;
    /** Heading level (only present for 'heading' type, 1-6) */
    level?: number;
    /** The text content of the block */
    text: string;
    /** Marks applied to ranges within the text */
    marks?: RawMark[];
    /** Additional block-specific data */
    data?: Record<string, unknown>;
}

/**
 * Raw content extracted from a file, consisting of multiple blocks.
 */
export interface RawContent {
    /** Array of content blocks */
    blocks: RawBlock[];
    /** Metadata about the source file */
    meta: FileMeta;
}

/**
 * Metadata about the source file.
 */
export interface FileMeta {
    /** Original file name */
    filename: string;
    /** MIME type of the file */
    mimeType: string;
    /** File size in bytes */
    size: number;
    /** Last modified timestamp (Unix ms) */
    lastModified: number;
    /** Original file extension */
    extension: string;
}

/**
 * Interface for file parsers.
 * Each parser converts a specific file type into RawContent.
 */
export interface Parser {
    /**
     * Parses a file and returns raw content.
     * @param file - The file to parse
     * @returns Promise resolving to raw content
     */
    parse(file: File): Promise<RawContent>;

    /**
     * The MIME types this parser can handle.
     */
    mimeTypes: string[];

    /**
     * The file extensions this parser can handle (without dot).
     */
    extensions: string[];
}
