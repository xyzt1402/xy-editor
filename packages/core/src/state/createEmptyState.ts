/**
 * Creates an empty editor state with a single empty paragraph node.
 * @package @xy-editor/core
 * @module state/createEmptyState
 */

import { generateId } from '../utils/generateId';
import type { EditorState, EditorNode } from './types';

/**
 * Creates a new empty editor state.
 *
 * Document structure:
 * doc
 * └── paragraph
 *     └── text ("")
 *
 * - No selection (null)
 * - Empty history stack
 * - meta.createdAt timestamp
 *
 * @returns A new EditorState with a single empty paragraph
 *
 * @example
 * ```typescript
 * const state = createEmptyState();
 * console.log(state.doc.children?.[0]?.type); // 'paragraph'
 * console.log(state.selection);               // null
 * console.log(state.history.past);            // []
 * ```
 */
export function createEmptyState(): EditorState {
    // Leaf text node — the actual editable content
    const textNode: EditorNode = {
        id: generateId(),
        type: 'text',
        text: '',
    };

    // Block container — holds text nodes as children
    const paragraphNode: EditorNode = {
        id: generateId(),
        type: 'paragraph',
        children: [textNode],
    };

    // Root document node — always type 'doc', never has text
    const docNode: EditorNode = {
        id: generateId(),
        type: 'doc',
        children: [paragraphNode],
    };

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