/**
 * Tests for useEditorState hook
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorState } from '../useEditorState';
import { createEmptyState } from '@xy-editor/core';
import { makeWrapper, makeControlledWrapper } from './utils';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useEditorState', () => {

    // ── Return value ──────────────────────────────────────────────────────────

    describe('return value', () => {
        it('returns the initial state from EditorProvider', () => {
            const initial = createEmptyState();
            const { result } = renderHook(() => useEditorState(), {
                wrapper: makeWrapper(initial),
            });

            // toBe — reference equality, not just deep equality
            expect(result.current).toBe(initial);
        });

        it('returns a state with a valid doc tree structure', () => {
            const { result } = renderHook(() => useEditorState(), {
                wrapper: makeWrapper(),
            });

            expect(result.current.doc.type).toBe('doc');
            expect(result.current.doc.children?.[0]?.type).toBe('paragraph');
            expect(result.current.doc.children?.[0]?.children?.[0]?.type).toBe('text');
        });

        it('returns null selection on initial state', () => {
            const { result } = renderHook(() => useEditorState(), {
                wrapper: makeWrapper(),
            });

            expect(result.current.selection).toBeNull();
        });

        it('returns empty history stacks on initial state', () => {
            const { result } = renderHook(() => useEditorState(), {
                wrapper: makeWrapper(),
            });

            expect(result.current.history.past).toHaveLength(0);
            expect(result.current.history.future).toHaveLength(0);
        });
    });

    // ── Reactivity ────────────────────────────────────────────────────────────

    describe('reactivity', () => {
        it('reflects new state when controlled value prop changes', () => {
            const { Wrapper, getSetState } = makeControlledWrapper();

            const { result } = renderHook(() => useEditorState(), {
                wrapper: Wrapper,
            });

            const firstState = result.current;
            const newState = createEmptyState();

            act(() => { getSetState()(newState); });

            expect(result.current).not.toBe(firstState);
            expect(result.current).toBe(newState);
        });
    });

    // ── Stability ─────────────────────────────────────────────────────────────

    describe('stability', () => {
        it('returns the same state reference when nothing has changed', () => {
            const { result, rerender } = renderHook(() => useEditorState(), {
                wrapper: makeWrapper(),
            });

            const before = result.current;
            rerender();
            expect(result.current).toBe(before);
        });
    });

    // ── Error handling ────────────────────────────────────────────────────────

    describe('error handling', () => {
        it('throws when used outside EditorProvider', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                renderHook(() => useEditorState());
            }).toThrow('[useEditorContext] Must be used within an <EditorProvider>');

            consoleSpy.mockRestore();
        });
    });
});