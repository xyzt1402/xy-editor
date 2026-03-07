/**
 * Transform functions for manipulating marks (inline formatting).
 * @package @xy-editor/core
 * @module transforms/marks
 */

import type { EditorState, Transaction, Mark, MarkType, TransformStep } from '../state/types';

/**
 * Generates a unique ID for transactions.
 */
let transactionIdCounter = 0;
function generateTransactionId(): string {
    return `tr_${++transactionIdCounter}_${Date.now()}`;
}

/**
 * Checks if a mark of the given type exists in the selection.
 */
function hasMark(state: EditorState, markType: MarkType): boolean {
    const { selection } = state;

    if (!selection) {
        return false;
    }

    // Check stored marks first
    if (state.storedMarks) {
        const hasStored = state.storedMarks.some(m => m.type === markType);
        if (hasStored) {
            return true;
        }
    }

    // For a collapsed selection (caret), check the stored marks
    if (selection.isCollapsed) {
        return false;
    }

    // For a range selection, we'd need to traverse the document
    // This is a simplified implementation
    return false;
}

/**
 * Creates a Transaction that adds a mark to the current selection.
 * 
 * @param state - The current editor state
 * @param markType - The type of mark to add (e.g., 'bold', 'italic')
 * @param attrs - Optional attributes for the mark (e.g., href for links)
 * @returns A transaction that adds the mark when applied
 * 
 * @example
 * ```typescript
 * const tr = addMark(state, 'bold');
 * const newState = applyTransaction(state, tr);
 * ```
 */
export function addMark(
    state: EditorState,
    markType: MarkType,
    attrs?: Record<string, unknown>
): Transaction {
    const mark: Mark = {
        type: markType,
        attrs,
    };

    // Create the transform step
    const step: TransformStep = {
        type: 'addMark',
        mark,
        position: state.selection
            ? {
                anchor: state.selection.anchor,
                focus: state.selection.focus,
            }
            : undefined,
    };

    return {
        id: generateTransactionId(),
        steps: [step],
        meta: {
            action: 'addMark',
            markType,
        },
    };
}

/**
 * Creates a Transaction that removes a mark from the current selection.
 * 
 * @param state - The current editor state
 * @param markType - The type of mark to remove
 * @returns A transaction that removes the mark when applied
 * 
 * @example
 * ```typescript
 * const tr = removeMark(state, 'bold');
 * const newState = applyTransaction(state, tr);
 * ```
 */
export function removeMark(
    state: EditorState,
    markType: MarkType
): Transaction {
    const mark: Mark = {
        type: markType,
    };

    // Create the transform step
    const step: TransformStep = {
        type: 'removeMark',
        mark,
        position: state.selection
            ? {
                anchor: state.selection.anchor,
                focus: state.selection.focus,
            }
            : undefined,
    };

    return {
        id: generateTransactionId(),
        steps: [step],
        meta: {
            action: 'removeMark',
            markType,
        },
    };
}

/**
 * Creates a Transaction that toggles a mark on the current selection.
 * If the mark exists in the selection, it will be removed.
 * If the mark doesn't exist, it will be added.
 * 
 * @param state - The current editor state
 * @param markType - The type of mark to toggle
 * @param attrs - Optional attributes for the mark (used when adding)
 * @returns A transaction that toggles the mark when applied
 * 
 * @example
 * ```typescript
 * const tr = toggleMark(state, 'bold');
 * const newState = applyTransaction(state, tr);
 * ```
 */
export function toggleMark(
    state: EditorState,
    markType: MarkType,
    attrs?: Record<string, unknown>
): Transaction {
    // Check if the mark already exists
    const markExists = hasMark(state, markType);

    if (markExists) {
        return removeMark(state, markType);
    } else {
        return addMark(state, markType, attrs);
    }
}
