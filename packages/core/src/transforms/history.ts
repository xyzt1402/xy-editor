/**
 * Transform functions for undo/redo operations.
 * @package @xy-editor/core
 * @module transforms/history
 */

import type { EditorState, HistoryEntry } from '../state/types';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Creates a history snapshot of the given state.
 *
 * IMPORTANT: We strip the history from the snapshot before storing it.
 * Storing full history inside each snapshot causes exponential memory growth:
 * entry 20 would contain entry 19 which contains entry 18... and so on.
 *
 * The active history stacks (past/future) are always managed by undo/redo
 * directly — they do not need to be embedded inside each snapshot.
 */
function createSnapshot(state: EditorState): HistoryEntry {
    return {
        state: {
            ...state,
            // Strip nested history to prevent recursive snapshots
            history: { past: [], future: [] },
        },
        timestamp: Date.now(),
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reverts the editor state to the previous state in history.
 *
 * Stack behaviour:
 * - Pops the last entry from history.past
 * - Pushes the current state onto the front of history.future
 * - Returns the popped state with updated history stacks attached
 *
 * @param state - The current editor state
 * @returns The previous editor state, or null if nothing to undo
 */
export function undo(state: EditorState): EditorState | null {
    const { history } = state;

    if (history.past.length === 0) return null;

    // TypeScript: length check above guarantees this exists
    const lastEntry = history.past[history.past.length - 1]!;

    return {
        // Restore the previous document and selection
        ...lastEntry.state,
        // Attach updated stacks — do NOT use lastEntry.state.history
        // (it was intentionally stripped when the snapshot was created)
        history: {
            past: history.past.slice(0, -1),
            // Most recent undo goes to the front so redo pops it first
            future: [createSnapshot(state), ...history.future],
        },
        // Preserve the meta from the restored state as-is.
        // Do not annotate with action:'undo' — that would mutate the
        // historical record of what the document looked like at that point.
        meta: lastEntry.state.meta,
    };
}

/**
 * Re-applies a previously undone state.
 *
 * Stack behaviour:
 * - Pops the first entry from history.future
 * - Pushes the current state onto the end of history.past
 * - Returns the popped state with updated history stacks attached
 *
 * @param state - The current editor state
 * @returns The next editor state from history, or null if nothing to redo
 */
export function redo(state: EditorState): EditorState | null {
    const { history } = state;

    if (history.future.length === 0) return null;

    // TypeScript: length check above guarantees this exists
    const nextEntry = history.future[0]!;

    return {
        // Restore the next document and selection
        ...nextEntry.state,
        // Attach updated stacks
        history: {
            // Current state goes to end of past so undo can pop it
            past: [...history.past, createSnapshot(state)],
            future: history.future.slice(1),
        },
        meta: nextEntry.state.meta,
    };
}