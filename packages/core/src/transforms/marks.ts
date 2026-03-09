/**
 * Transform functions for inline mark operations.
 * @package @xy-editor/core
 * @module transforms/marks
 */

import type {
    EditorState,
    Transaction,
    Mark,
    MarkType,
    TransformStep,
    EditorNode,
} from '../state/types';
import { generateId } from '../utils/generateId';

// ─── Internal: Tree Traversal ─────────────────────────────────────────────────

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

// ─── Internal: Mark Active Check ─────────────────────────────────────────────

/**
 * Returns true if the given mark is active across the entire selection.
 *
 * Rules:
 * - Collapsed selection (caret): checks storedMarks
 * - Range selection: returns true only if ALL text nodes in range have the mark
 *   (partial coverage = inactive, so toggle will add to make it uniform)
 */
export function isMarkActiveInSelection(
    state: EditorState,
    markType: MarkType,
): boolean {
    const { selection, doc } = state;
    if (!selection) return false;

    // Collapsed — check storedMarks (marks for the next typed character)
    if (selection.isCollapsed) {
        return (state.storedMarks ?? []).some((m) => m.type === markType);
    }

    // Range — ALL text nodes in range must have the mark
    const textNodes: EditorNode[] = [];
    collectTextNodes(doc, textNodes);

    const anchorIdx = textNodes.findIndex((n) => n.id === selection.anchor.nodeId);
    const focusIdx = textNodes.findIndex((n) => n.id === selection.focus.nodeId);

    // If we can't find the nodes, treat mark as inactive
    if (anchorIdx === -1 || focusIdx === -1) return false;

    const start = Math.min(anchorIdx, focusIdx);
    const end = Math.max(anchorIdx, focusIdx);

    for (let i = start; i <= end; i++) {
        const hasMark = (textNodes[i]!.marks ?? []).some((m) => m.type === markType);
        if (!hasMark) return false;
    }

    return true;
}

// ─── Internal: Position Helper ────────────────────────────────────────────────

/**
 * Extracts the step position from the current selection.
 * Throws if no selection is active — mark operations require a selection.
 */
function requirePosition(
    state: EditorState,
    operationName: string,
): NonNullable<TransformStep['position']> {
    if (!state.selection) {
        throw new Error(
            `[${operationName}] Cannot apply mark transform without an active selection.`,
        );
    }
    return {
        anchor: state.selection.anchor,
        focus: state.selection.focus,
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a transaction that adds a mark to the current selection.
 *
 * @throws If there is no active selection
 *
 * @example
 * ```typescript
 * dispatch(addMark(state, 'bold'));
 * dispatch(addMark(state, 'link', { href: 'https://example.com' }));
 * ```
 */
export function addMark(
    state: EditorState,
    markType: MarkType,
    attrs?: Record<string, unknown>,
): Transaction {

    const position = requirePosition(state, 'addMark');

    const mark: Mark = {
        type: markType,
        // Only include attrs when provided — avoids { attrs: undefined } on the object
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
 * Creates a transaction that removes a mark from the current selection.
 * Removal matches by mark type only — attrs are ignored.
 *
 * @throws If there is no active selection
 *
 * @example
 * ```typescript
 * dispatch(removeMark(state, 'bold'));
 * ```
 */
export function removeMark(
    state: EditorState,
    markType: MarkType,
): Transaction {
    const position = requirePosition(state, 'removeMark');

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
 * Creates a transaction that toggles a mark on the current selection.
 *
 * Toggle rules:
 * - ALL nodes in selection have mark → removes it
 * - ANY node is missing mark → adds it to all (makes selection uniform)
 * - Collapsed selection → checks storedMarks instead
 *
 * @throws If there is no active selection
 *
 * @example
 * ```typescript
 * dispatch(toggleMark(state, 'bold'));   // Cmd+B
 * dispatch(toggleMark(state, 'italic')); // Cmd+I
 * ```
 */
export function toggleMark(
    state: EditorState,
    markType: MarkType,
    attrs?: Record<string, unknown>,
): Transaction {
    return isMarkActiveInSelection(state, markType)
        ? removeMark(state, markType)
        : addMark(state, markType, attrs);
}