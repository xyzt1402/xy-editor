/**
 * Core type definitions for the xy-editor state management.
 * @package @xy-editor/core
 * @module state/types
 */

// ─── Marks ────────────────────────────────────────────────────────────────────

/**
 * All supported inline mark types.
 * The trailing `& string` allows custom mark types while preserving
 * autocomplete for the known values.
 */
export type MarkType =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'link'
    | 'color'
    | 'highlight'
    | 'fontFamily'
    | 'fontSize'
    | (string & Record<never, never>); // allows custom marks with autocomplete

/**
 * An inline formatting mark applied to a text node.
 */
export interface Mark {
    type: MarkType;
    /** Mark-specific attributes, e.g. { href } for links, { color } for color */
    attrs?: Record<string, unknown>;
}

// ─── Nodes ────────────────────────────────────────────────────────────────────

/**
 * All supported document node types.
 * The trailing `& string` allows custom node types while preserving
 * autocomplete for the known values.
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
    | 'table'
    | 'tableRow'
    | 'tableCell'
    | 'hardBreak'
    | (string & Record<never, never>);

/**
 * A node in the document tree.
 *
 * Nodes are either:
 * - Container nodes: have `children`, no `text` (e.g. paragraph, heading, doc)
 * - Leaf text nodes: have `text`, no `children` (type === 'text')
 *
 * These are mutually exclusive — a node should never have both.
 */
export interface EditorNode {
    /** Unique identifier — used for selection tracking and DOM reconciliation */
    readonly id: string;
    type: NodeType;
    /** Child nodes — present on container nodes, absent on text leaves */
    children?: EditorNode[];
    /** Text content — present on type === 'text' nodes only */
    text?: string;
    /** Inline formatting marks — present on type === 'text' nodes only */
    marks?: Mark[];
    /** Block/node-level attributes, e.g. { level } for headings, { alignment } */
    attrs?: Record<string, unknown>;
}

// ─── Selection ────────────────────────────────────────────────────────────────

/**
 * A point in the document, identified by node ID and character offset.
 */
export interface SelectionPoint {
    /** ID of the EditorNode this point is in */
    nodeId: string;
    /** Character offset within the node's text content */
    offset: number;
}

/**
 * A selection in the document.
 * Can be a caret (collapsed) or a range.
 */
export interface Selection {
    /** Start of the selection (always the earlier position in the document) */
    anchor: SelectionPoint;
    /** End of the selection (always the later position in the document) */
    focus: SelectionPoint;
    /** True if anchor === focus (cursor with no range) */
    isCollapsed?: boolean;
    /** True if the user dragged backwards (focus is before anchor in the doc) */
    reversed?: boolean;
}

// ─── History ──────────────────────────────────────────────────────────────────

/**
 * A snapshot of editor state stored in the history stack.
 * The nested history is stripped before storage to prevent
 * exponential memory growth (history-within-history).
 */
export interface HistoryEntry {
    /**
     * The EditorState at this point in time.
     * history.past and history.future are always empty inside a snapshot —
     * the active stacks live only on the current state.
     */
    state: EditorState;
    /** Unix timestamp (ms) when this entry was created */
    timestamp: number;
}

/**
 * The undo/redo history stacks.
 *
 * Stack conventions:
 * - `past`: LIFO — most recent undo entry is at the END (pop from end)
 * - `future`: LIFO — most recent redo entry is at the FRONT (pop from front)
 */
export interface HistoryStack {
    past: HistoryEntry[];
    future: HistoryEntry[];
}

// ─── Editor State ─────────────────────────────────────────────────────────────

/**
 * The complete, immutable editor state at a point in time.
 * All mutations return a new EditorState — the original is never modified.
 */
export interface EditorState {
    /** Root document node (always type === 'doc') */
    doc: EditorNode;
    /** Current selection, or null if the editor is not focused */
    selection: Selection | null;
    /** Undo/redo history */
    history: HistoryStack;
    /**
     * Marks to apply to the next typed character.
     * Set when the user toggles a mark with a collapsed selection (caret).
     * Cleared after the next insertText operation.
     */
    storedMarks?: Mark[];
    /** Arbitrary metadata — last modified time, source file info, etc. */
    meta?: Record<string, unknown>;
}

// ─── Transactions & Steps ─────────────────────────────────────────────────────

/**
 * All valid transform step types.
 * Every type must be handled in applyTransaction's switch statement.
 */
export type TransformStepType =
    | 'addMark'        // add a mark to text nodes in selection
    | 'removeMark'     // remove a mark from text nodes in selection
    | 'setNode'        // update attrs on a node
    | 'insertText'     // insert plain text at the current selection
    | 'insertNode'     // insert an EditorNode at the current selection
    | 'deleteText'     // delete text within a range
    | 'deleteNode'     // remove a node from the tree
    | 'replaceDoc'     // replace the entire document (used by file ingestion)
    | 'clearDoc'       // reset document to a single empty paragraph
    | 'splitNode'      // split a node at the selection (e.g. Enter key)
    | 'mergeNode';     // merge a node with the previous sibling (e.g. Backspace)

/**
 * A single atomic transformation step within a transaction.
 */
export interface TransformStep {
    type: TransformStepType;
    /**
     * The document position(s) this step operates on.
     * Both anchor and focus are optional — some steps (clearDoc, replaceDoc)
     * don't require a position.
     */
    position?: {
        anchor?: SelectionPoint;
        focus?: SelectionPoint;
    };
    /** The node to insert (insertNode) or the replacement doc (replaceDoc) */
    node?: EditorNode;
    /** The mark to add or remove (addMark, removeMark) */
    mark?: Mark;
    /** Step-specific data payload */
    data?: Record<string, unknown>;
}

/**
 * A transaction groups one or more steps to be applied atomically.
 * The entire transaction is pushed as one history entry.
 */
export interface Transaction {
    /** Unique identifier — use generateId() from utils */
    id: string;
    steps: TransformStep[];
    /** Optional metadata for debugging and history labelling */
    meta?: Record<string, unknown>;
}

// ─── Plugins ──────────────────────────────────────────────────────────────────

/**
 * An editor plugin.
 * Use the TConfig generic to type plugin-specific configuration.
 */
export interface EditorPlugin<TConfig = unknown> {
    readonly name: string;
    readonly version?: string;
    init?: () => void | Promise<void>;
    destroy?: () => void | Promise<void>;
    readonly config?: TConfig;
}