/**
 * Transform functions for undo/redo operations.
 * @package @xy-editor/core
 * @module transforms/history
 *
 */

import type { EditorState, HistoryEntry } from '../state/types';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Creates a history snapshot of the given state.
 *
 * Rules:
 * 1. history.past and history.future are stripped — storing full history inside
 *    each snapshot causes exponential memory growth (history-within-history).
 * 2. storedMarks are stripped — they are transient input state, not part of
 *    the document record (BUG-21 fix).
 */
function createSnapshot(state: EditorState): HistoryEntry {
    return {
        state: {
            doc: state.doc,
            selection: state.selection,
            meta: state.meta,
            // Strip transient and recursive fields (BUG-21)
            storedMarks: undefined,
            history: { past: [], future: [] },
        },
        timestamp: Date.now(),
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reverts the editor state to the previous state in history.
 *
 * Stack behaviour (BUG-08 fix — now symmetric with redo):
 * - Pops the last entry from history.past  (past[past.length - 1])
 * - Pushes a snapshot of current state onto the END of history.future
 * - Returns the popped state with updated history stacks attached
 *
 * @param state - The current editor state
 * @returns The previous editor state, or null if nothing to undo
 */
export function undo(state: EditorState): EditorState | null {
    const { history } = state;
    if (history.past.length === 0) return null;

    const lastEntry = history.past[history.past.length - 1]!;

    return {
        ...lastEntry.state,
        history: {
            past: history.past.slice(0, -1),
            future: [...history.future, createSnapshot(state)],
        },
        meta: lastEntry.state.meta,
    };
}

/**
 * Re-applies a previously undone state.
 *
 * Stack behaviour (BUG-08 fix — now symmetric with undo):
 * - Pops the last entry from history.future  (future[future.length - 1])
 * - Pushes a snapshot of current state onto the END of history.past
 * - Returns the popped state with updated history stacks attached
 *
 * @param state - The current editor state
 * @returns The next editor state from history, or null if nothing to redo
 */
export function redo(state: EditorState): EditorState | null {
    const { history } = state;
    if (history.future.length === 0) return null;

    // BUG-08 fix: pop from END of future (was popping from front)
    const nextEntry = history.future[history.future.length - 1]!;

    return {
        ...nextEntry.state,
        // BUG-21: storedMarks cleared by createSnapshot
        history: {
            past: [...history.past, createSnapshot(state)],
            future: history.future.slice(0, -1),
        },
        meta: nextEntry.state.meta,
    };
}