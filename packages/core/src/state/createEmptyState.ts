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
 *   doc
 *   └── paragraph
 *       └── text ("")
 *
 * - selection: null
 * - history: empty past and future stacks
 * - meta.createdAt: current timestamp
 * 
 *  @returns A new EditorState with a single empty paragraph
 *
 * @example
 * ```typescript
 * const state = createEmptyState();
 * state.doc.type;                      // 'doc'
 * state.doc.children?.[0]?.type;       // 'paragraph'
 * state.doc.children?.[0]?.children?.[0]?.type; // 'text'
 * state.selection;                     // null
 * state.history.past;                  // []
 * ```
 */
export function createEmptyState(): EditorState {
    // Leaf — the actual editable content unit
    const textNode: EditorNode = {
        id: generateId(),
        type: 'text',
        text: '',
    };

    // Block container — holds one or more text leaf nodes
    const paragraphNode: EditorNode = {
        id: generateId(),
        type: 'paragraph',
        children: [textNode],
    };

    // Document root — always type 'doc', never has text or marks
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