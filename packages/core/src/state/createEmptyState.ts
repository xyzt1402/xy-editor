/**
 * Creates an empty editor state with a single empty paragraph node.
 * @package @xy-editor/core
 * @module state/createEmptyState
 */

import { nanoid } from 'nanoid';
import type { EditorState } from './types';

/**
 * Generates a unique ID for nodes.
 * Uses a nanoid for better uniqueness and performance compared to a simple counter.
 * @returns A unique string ID
 * @example
 * const id1 = generateNodeId(); // e.g. 'V1StGXR8_Z5jdHi6B-myT'
 * const id2 = generateNodeId(); // e.g. 'mJ9s8fX9a2b3c4d5e6f7g'
 * console.log(id1 !== id2); // true
 */
export function generateNodeId(): string {
    return nanoid();
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
