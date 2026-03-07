/**
 * Creates an empty editor state with a single empty paragraph node.
 * @package @xy-editor/core
 * @module state/createEmptyState
 */

import type { EditorState } from './types';

/**
 * Generates a unique ID for nodes.
 * Uses a simple counter-based approach for consistency.
 */
let nodeIdCounter = 0;
function generateNodeId(): string {
    return `node_${++nodeIdCounter}_${Date.now()}`;
}

/**
 * Creates a new empty editor state.
 * 
 * The initial state contains:
 * - A document with a single empty paragraph node
 * - No selection (null)
 * - Empty history stack (no past or future entries)
 * 
 * @returns A new EditorState with an empty paragraph
 * 
 * @example
 * ```typescript
 * const state = createEmptyState();
 * console.log(state.doc.children?.[0]?.type); // 'paragraph'
 * console.log(state.selection); // null
 * console.log(state.history.past); // []
 * ```
 */
export function createEmptyState(): EditorState {
    // Create the initial paragraph node
    const paragraphNode = {
        id: generateNodeId(),
        type: 'paragraph',
        text: '',
        children: [],
        marks: [],
        attrs: {},
    };

    // Create the root document node containing the paragraph
    const docNode = {
        id: generateNodeId(),
        type: 'doc',
        children: [paragraphNode],
        attrs: {},
    };

    // Return the initial state
    return {
        doc: docNode,
        selection: null,
        history: {
            past: [],
            future: [],
        },
        meta: {
            createdAt: Date.now(),
        },
    };
}
