/**
 * Transform functions for manipulating marks (inline formatting).
 * @package @xy-editor/core
 * @module transforms/marks
 */

import type { EditorState, Transaction, Mark, MarkType, TransformStep, EditorNode } from '../state/types';
import { generateId } from '../utils/generateId';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Collects all text nodes between anchor and focus in document order.
 * Reuses the same traversal logic as applyTransaction.
 */
function collectTextNodes(node: EditorNode, result: EditorNode[]): void {
    if (node.type === 'text') {
        result.push(node);
        return;
    }
    if (node.children) {
        for (const child of node.children) {
            collectTextNodes(child, result);
        }
    }
}

/**
 * Checks whether ALL text nodes in the current selection have the given mark.
 *
 * Standard toggle behaviour:
 * - All nodes have mark → mark is "active" → toggle will remove it
 * - Any node is missing mark → mark is "inactive" → toggle will add it
 *
 * This ensures that selecting mixed content (some bold, some not) and pressing
 * Cmd+B makes everything bold first, then a second press removes it.
 *
 * For a collapsed selection (caret), checks storedMarks instead of the tree.
 */
function isMarkActive(state: EditorState, markType: MarkType): boolean {
    const { selection, doc } = state;

    if (!selection) return false;

    // Collapsed selection (caret) — check storedMarks
    // storedMarks represent the marks that will be applied to the next typed character
    if (selection.isCollapsed) {
        return (state.storedMarks ?? []).some((m) => m.type === markType);
    }

    // Range selection — check if ALL text nodes in range have the mark
    const textNodes: EditorNode[] = [];
    collectTextNodes(doc, textNodes);

    const anchorIdx = textNodes.findIndex((n) => n.id === selection.anchor.nodeId);
    const focusIdx = textNodes.findIndex((n) => n.id === selection.focus.nodeId);

    // If we can't find the nodes, treat mark as inactive
    if (anchorIdx === -1 || focusIdx === -1) return false;

    const start = Math.min(anchorIdx, focusIdx);
    const end = Math.max(anchorIdx, focusIdx);

    // Every node in range must have the mark for it to be considered active
    for (let i = start; i <= end; i++) {
        const node = textNodes[i]!;
        const hasMarkOnNode = (node.marks ?? []).some((m) => m.type === markType);
        if (!hasMarkOnNode) return false;
    }

    return true;
}

/**
 * Extracts the position from the current selection.
 * Throws if no selection is active — callers should guard before calling mark transforms.
 */
function requireSelectionPosition(
    state: EditorState,
    operationName: string,
): NonNullable<TransformStep['position']> {
    if (!state.selection) {
        throw new Error(
            `[${operationName}] Cannot apply mark transform without an active selection.`
        );
    }
    return {
        anchor: state.selection.anchor,
        focus: state.selection.focus,
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a Transaction that adds a mark to the current selection.
 *
 * @throws If there is no active selection
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
    attrs?: Record<string, unknown>,
): Transaction {
    const position = requireSelectionPosition(state, 'addMark');

    // Only include attrs if they were actually provided
    const mark: Mark = {
        type: markType,
        ...(attrs !== undefined && { attrs }),
    };

    const step: TransformStep = {
        type: 'addMark',
        mark,
        position,
    };

    return {
        id: generateId(),
        steps: [step],
        meta: { action: 'addMark', markType },
    };
}

/**
 * Creates a Transaction that removes a mark from the current selection.
 * Only the mark type is needed for removal — attrs are not matched.
 *
 * @throws If there is no active selection
 *
 * @example
 * ```typescript
 * const tr = removeMark(state, 'bold');
 * const newState = applyTransaction(state, tr);
 * ```
 */
export function removeMark(
    state: EditorState,
    markType: MarkType,
): Transaction {
    const position = requireSelectionPosition(state, 'removeMark');

    // attrs intentionally omitted — removal matches by type only
    const mark: Mark = { type: markType };

    const step: TransformStep = {
        type: 'removeMark',
        mark,
        position,
    };

    return {
        id: generateId(),
        steps: [step],
        meta: { action: 'removeMark', markType },
    };
}

/**
 * Creates a Transaction that toggles a mark on the current selection.
 *
 * Toggle behaviour:
 * - ALL nodes in selection have mark → removes it
 * - ANY node in selection is missing mark → adds it to all
 *
 * For a collapsed selection, checks storedMarks instead of the document tree.
 *
 * @throws If there is no active selection
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
    attrs?: Record<string, unknown>,
): Transaction {
    return isMarkActive(state, markType)
        ? removeMark(state, markType)
        : addMark(state, markType, attrs);
}

/**
 * Returns whether a mark is currently active in the selection.
 * Useful for updating toolbar button pressed states.
 *
 * @example
 * ```typescript
 * const isBold = isMarkActiveInSelection(state, 'bold');
 * // Use to set toolbar button active state
 * ```
 */
export { isMarkActive as isMarkActiveInSelection };