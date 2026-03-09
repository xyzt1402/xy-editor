/**
 * Tests for useHistory hook
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../useHistory';
import { createEmptyState } from '@xy-editor/core';
import { makeWrapper, makeControlledWrapper } from './utils';
import type { EditorState } from '@xy-editor/core';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeStateWithPast(count = 1): EditorState {
    const snapshot = createEmptyState();
    return {
        ...createEmptyState(),
        history: {
            past: Array.from({ length: count }, () => ({
                state: { ...snapshot, history: { past: [], future: [] } },
                timestamp: Date.now(),
            })),
            future: [],
        },
    };
}

function makeStateWithFuture(count = 1): EditorState {
    const snapshot = createEmptyState();
    return {
        ...createEmptyState(),
        history: {
            past: [],
            future: Array.from({ length: count }, () => ({
                state: { ...snapshot, history: { past: [], future: [] } },
                timestamp: Date.now(),
            })),
        },
    };
}

function makeStateWithBoth(): EditorState {
    const snapshot = { ...createEmptyState(), history: { past: [], future: [] } };
    const entry = { state: snapshot, timestamp: Date.now() };
    return {
        ...createEmptyState(),
        history: { past: [entry], future: [entry] },
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useHistory', () => {

    // ── canUndo / canRedo flags ───────────────────────────────────────────────

    describe('canUndo / canRedo', () => {
        it('both false when history is empty', () => {
            const { result } = renderHook(() => useHistory(), {
                wrapper: makeWrapper(createEmptyState()),
            });

            expect(result.current.canUndo).toBe(false);
            expect(result.current.canRedo).toBe(false);
        });

        it('canUndo true, canRedo false when past has entries', () => {
            const { result } = renderHook(() => useHistory(), {
                wrapper: makeWrapper(makeStateWithPast(1)),
            });

            expect(result.current.canUndo).toBe(true);
            expect(result.current.canRedo).toBe(false);
        });

        it('canRedo true, canUndo false when future has entries', () => {
            const { result } = renderHook(() => useHistory(), {
                wrapper: makeWrapper(makeStateWithFuture(1)),
            });

            expect(result.current.canUndo).toBe(false);
            expect(result.current.canRedo).toBe(true);
        });

        it('both true when past and future both have entries', () => {
            const { result } = renderHook(() => useHistory(), {
                wrapper: makeWrapper(makeStateWithBoth()),
            });

            expect(result.current.canUndo).toBe(true);
            expect(result.current.canRedo).toBe(true);
        });

        it('reflects multiple past entries correctly', () => {
            const { result } = renderHook(() => useHistory(), {
                wrapper: makeWrapper(makeStateWithPast(3)),
            });

            expect(result.current.canUndo).toBe(true);
        });
    });

    // ── undo ──────────────────────────────────────────────────────────────────

    describe('undo', () => {
        it('calls onChange with the previous state', () => {
            const { Wrapper, onChange } = makeControlledWrapper(makeStateWithPast(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.undo(); });

            expect(onChange).toHaveBeenCalledOnce();
        });

        it('restored state has the past entry consumed', () => {
            const { Wrapper, onChange } = makeControlledWrapper(makeStateWithPast(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.undo(); });

            const restoredState: EditorState = onChange.mock.calls[0]![0]!;
            expect(restoredState.history.past).toHaveLength(0);
        });

        it('moves current state into future after undo', () => {
            const { Wrapper, onChange } = makeControlledWrapper(makeStateWithPast(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.undo(); });

            const restoredState: EditorState = onChange.mock.calls[0]![0]!;
            expect(restoredState.history.future).toHaveLength(1);
        });

        it('is a no-op when canUndo is false — onChange not called', () => {
            const { Wrapper, onChange } = makeControlledWrapper(createEmptyState());

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.undo(); });

            expect(onChange).not.toHaveBeenCalled();
        });

        it('canUndo becomes false after undoing the only past entry', () => {
            const { Wrapper } = makeControlledWrapper(makeStateWithPast(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.undo(); });

            expect(result.current.canUndo).toBe(false);
        });
    });

    // ── redo ──────────────────────────────────────────────────────────────────

    describe('redo', () => {
        it('calls onChange with the next state', () => {
            const { Wrapper, onChange } = makeControlledWrapper(makeStateWithFuture(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.redo(); });

            expect(onChange).toHaveBeenCalledOnce();
        });

        it('restored state has the future entry consumed', () => {
            const { Wrapper, onChange } = makeControlledWrapper(makeStateWithFuture(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.redo(); });

            const restoredState: EditorState = onChange.mock.calls[0]![0]!;
            expect(restoredState.history.future).toHaveLength(0);
        });

        it('moves current state into past after redo', () => {
            const { Wrapper, onChange } = makeControlledWrapper(makeStateWithFuture(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.redo(); });

            const restoredState: EditorState = onChange.mock.calls[0]![0]!;
            expect(restoredState.history.past).toHaveLength(1);
        });

        it('is a no-op when canRedo is false — onChange not called', () => {
            const { Wrapper, onChange } = makeControlledWrapper(createEmptyState());

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.redo(); });

            expect(onChange).not.toHaveBeenCalled();
        });

        it('canRedo becomes false after redoing the only future entry', () => {
            const { Wrapper } = makeControlledWrapper(makeStateWithFuture(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.redo(); });

            expect(result.current.canRedo).toBe(false);
        });
    });

    // ── undo → redo round-trip ────────────────────────────────────────────────

    describe('undo → redo round-trip', () => {
        it('redo after undo restores the original stack shape', () => {
            const { Wrapper, onChange } = makeControlledWrapper(makeStateWithPast(1));

            const { result } = renderHook(() => useHistory(), { wrapper: Wrapper });

            act(() => { result.current.undo(); });
            act(() => { result.current.redo(); });

            expect(onChange).toHaveBeenCalledTimes(2);

            const finalState: EditorState = onChange.mock.calls[1]![0]!;
            expect(finalState.history.past).toHaveLength(1);
            expect(finalState.history.future).toHaveLength(0);
        });
    });

    // ── Stability ─────────────────────────────────────────────────────────────

    describe('stability', () => {
        it('undo reference is stable across re-renders', () => {
            const { result, rerender } = renderHook(() => useHistory(), {
                wrapper: makeWrapper(createEmptyState()),
            });

            const undoBefore = result.current.undo;
            rerender();
            expect(result.current.undo).toBe(undoBefore);
        });

        it('redo reference is stable across re-renders', () => {
            const { result, rerender } = renderHook(() => useHistory(), {
                wrapper: makeWrapper(createEmptyState()),
            });

            const redoBefore = result.current.redo;
            rerender();
            expect(result.current.redo).toBe(redoBefore);
        });
    });
});