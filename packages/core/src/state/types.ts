/**
 * Core type definitions for the xy-editor state management.
 * @package @xy-editor/core
 * @module state/types
 */

/**
 * Represents a position in the document.
 * Uses 0-based indexing for both line and column.
 */
export interface Position {
    /** Line number (0-based) */
    line: number;
    /** Column offset within the line (0-based) */
    column: number;
}

/**
 * Represents a mark (inline formatting) that can be applied to text.
 * Examples: bold, italic, code, link, etc.
 */
export interface Mark {
    /** The type of mark (e.g., 'bold', 'italic', 'code', 'link') */
    type: string;
    /** Optional attributes for the mark (e.g., href for links) */
    attrs?: Record<string, unknown>;
}

/**
 * Union type representing all possible mark types.
 * Extensible via string literal types for custom marks.
 */
export type MarkType =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'link'
    | 'highlight'
    | string;

/**
 * Represents a node in the document tree.
 * Nodes can be block-level (paragraphs, headings, lists) or inline.
 */
export interface EditorNode {
    /** Unique identifier for this node */
    id: string;
    /** The type of node (e.g., 'paragraph', 'heading', 'text') */
    type: string;
    /** Child nodes (for container nodes) */
    children?: EditorNode[];
    /** Text content (for text nodes) */
    text?: string;
    /** Marks applied to this node or text */
    marks?: Mark[];
    /** Optional attributes for the node */
    attrs?: Record<string, unknown>;
}

/**
 * Union type representing all possible node types.
 * Extensible via string literal types for custom node types.
 */
export type NodeType =
    | 'doc'
    | 'paragraph'
    | 'heading'
    | 'text'
    | 'bulletList'
    | 'orderedList'
    | 'listItem'
    | 'blockquote'
    | 'codeBlock'
    | 'horizontalRule'
    | string;

/**
 * Represents a selection in the document.
 * Can be a caret (collapsed selection) or a range.
 */
export interface Selection {
    /** ID of the anchor node */
    anchor: {
        nodeId: string;
        offset: number;
    };
    /** ID of the head/focus node */
    focus: {
        nodeId: string;
        offset: number;
    };
    /** Whether the selection is reversed (focus before anchor) */
    reversed?: boolean;
    /** Whether this is a caret (single position) */
    isCollapsed?: boolean;
}

/**
 * Represents a single entry in the history stack.
 * Contains the state before a change was applied.
 */
export interface HistoryEntry {
    /** The state before the change */
    state: EditorState;
    /** Timestamp when this entry was created (Unix timestamp in ms) */
    timestamp: number;
}

/**
 * Manages the undo/redo history stack.
 */
export interface HistoryStack {
    /** Array of past states (for undo) */
    past: HistoryEntry[];
    /** Array of future states (for redo) */
    future: HistoryEntry[];
}

/**
 * The complete editor state.
 * This is an immutable snapshot of the document at a point in time.
 */
export interface EditorState {
    /** The root document node */
    doc: EditorNode;
    /** Current selection (null if no selection) */
    selection: Selection | null;
    /** History stack for undo/redo */
    history: HistoryStack;
    /** Optional map of stored marks for the current input state */
    storedMarks?: Mark[];
    /** Additional metadata */
    meta?: Record<string, unknown>;
}

/**
 * Represents a single transformation to apply to the document.
 * A transaction is a collection of one or more steps.
 */
export interface TransformStep {
    /** The type of transform (e.g., 'addMark', 'removeMark', 'insert', 'delete') */
    type: string;
    /** Position or range to apply the transform */
    position?: {
        anchor?: { nodeId: string; offset: number };
        focus?: { nodeId: string; offset: number };
    };
    /** The node to insert (for insert operations) */
    node?: EditorNode;
    /** The mark to add or remove (for mark operations) */
    mark?: Mark;
    /** Additional transform-specific data */
    data?: Record<string, unknown>;
}

/**
 * A Transaction represents a collection of transforms to apply atomically.
 * Each transaction can have multiple steps that are applied in order.
 */
export interface Transaction {
    /** Unique identifier for this transaction */
    id: string;
    /** Array of steps to apply */
    steps: TransformStep[];
    /** Optional metadata about the transaction */
    meta?: Record<string, unknown>;
}
