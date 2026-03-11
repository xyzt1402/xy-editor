/**
 * Hook to access undo/redo functionality.
 * @package @xy-editor/react
 * @module hooks/useHistory
 *
 */

import { useCallback, useRef, useEffect } from 'react';
import { useEditorContext } from '../context/EditorContext';
import { undo as coreUndo, redo as coreRedo } from '@xy-editor/core';
import type { EditorState } from '@xy-editor/core';

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

    // Commands read stateRef.current rather than capturing `state` directly.
    // This ensures rapid successive calls always see the latest state rather
    // than the same stale snapshot from a previous render cycle.
    const stateRef = useRef<EditorState>(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Derived inline from live state for accurate disabled states in the UI.
    // These are primitives — React compares by value so no extra memoization needed.
    const canUndo = state.history.past.length > 0;
    const canRedo = state.history.future.length > 0;

    // ── undo ──────────────────────────────────────────────────────────────────
    // BUG-05 fix: reads stateRef.current, not the captured `state`.
    // BP-01 fix: `setState` is the only dep — callback is truly stable.
    const undo = useCallback(() => {
        const current = stateRef.current;
        if (current.history.past.length === 0) return;
        const previousState = coreUndo(current);
        if (previousState) setState(previousState);
    }, [setState]);

    // ── redo ──────────────────────────────────────────────────────────────────
    const redo = useCallback(() => {
        const current = stateRef.current;
        if (current.history.future.length === 0) return;
        const nextState = coreRedo(current);
        if (nextState) setState(nextState);
    }, [setState]);

    return { canUndo, canRedo, undo, redo };
}