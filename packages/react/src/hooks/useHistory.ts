/**
 * Hook to access undo/redo functionality.
 * @package @xy-editor/react
 * @module hooks/useHistory
 */

import { useCallback } from 'react';
import { useEditorContext } from '../context/EditorContext';
import { undo as coreUndo, redo as coreRedo } from '@xy-editor/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseHistoryReturn {
    /** True if there is at least one action to undo */
    canUndo: boolean;
    /** True if there is at least one action to redo */
    canRedo: boolean;
    /** Reverts the last action. No-op if canUndo is false */
    undo: () => void;
    /** Re-applies the last undone action. No-op if canRedo is false */
    redo: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to access history (undo/redo) functionality.
 *
 * undo/redo replace the entire state via setState rather than going through
 * applyTransaction. This is intentional — undo/redo restore a previous
 * EditorState snapshot; they are not incremental document edits.
 *
 * canUndo and canRedo are derived inline from state — no useMemo needed
 * since a boolean comparison is cheaper than memoization overhead.
 *
 * @example
 * ```tsx
 * const { canUndo, canRedo, undo, redo } = useHistory();
 *
 * return (
 *   <>
 *     <button onClick={undo} disabled={!canUndo}>Undo</button>
 *     <button onClick={redo} disabled={!canRedo}>Redo</button>
 *   </>
 * );
 * ```
 */
export function useHistory(): UseHistoryReturn {
    const { state, setState } = useEditorContext();

    // Derived inline — a boolean comparison is cheaper than useMemo overhead
    const canUndo = state.history.past.length > 0;
    const canRedo = state.history.future.length > 0;

    // ── undo ──────────────────────────────────────────────────────────────────
    // coreUndo computes the complete previous EditorState from the history
    // stack. We replace state wholesale via setState — NOT via dispatch/
    // applyTransaction — because undo is restoring a snapshot, not applying
    // an incremental transform.
    const undo = useCallback(() => {
        if (!canUndo) return; // guard prevents calling coreUndo unnecessarily

        const previousState = coreUndo(state);
        if (previousState) {
            setState(previousState);
        }
    }, [state, setState, canUndo]);

    // ── redo ──────────────────────────────────────────────────────────────────
    const redo = useCallback(() => {
        if (!canRedo) return;

        const nextState = coreRedo(state);
        if (nextState) {
            setState(nextState);
        }
    }, [state, setState, canRedo]);

    // Return a plain object — no useMemo needed.
    // canUndo/canRedo are primitives (stable by value).
    // undo/redo are stable useCallback refs.
    // React's reconciler handles this efficiently without memoization.
    return { canUndo, canRedo, undo, redo };
}