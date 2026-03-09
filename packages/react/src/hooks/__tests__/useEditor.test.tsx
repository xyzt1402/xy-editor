/**
 * Tests for useEditor hook
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '../useEditor';
import { createEmptyState } from '@xy-editor/core';
import { makeWrapper, makeControlledWrapper } from './utils';
import type { EditorState } from '@xy-editor/core';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Builds a state where the first text node has a bold mark and a selection
 * covering it — used to test isActive and getAttributes.
 */
function makeStateWithBold(): EditorState {
    const state = createEmptyState();
    const textNode = state.doc.children![0]!.children![0]!;
    return {
        ...state,
        selection: {
            anchor: { nodeId: textNode.id, offset: 0 },
            focus: { nodeId: textNode.id, offset: 5 },
            isCollapsed: false,
        },
        doc: {
            ...state.doc,
            children: [{
                ...state.doc.children![0]!,
                children: [{
                    ...textNode,
                    text: 'Hello',
                    marks: [{ type: 'bold' }],
                }],
            }],
        },
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useEditor', () => {

    // ── Return shape ──────────────────────────────────────────────────────────

    describe('return shape', () => {
        it('returns state, commands, isActive, and getAttributes', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(),
            });

            expect(result.current.state).toBeDefined();
            expect(result.current.commands).toBeDefined();
            expect(typeof result.current.isActive).toBe('function');
            expect(typeof result.current.getAttributes).toBe('function');
        });

        it('exposes all expected commands', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(),
            });

            const expectedCommands = [
                'bold', 'italic', 'underline', 'strike', 'code',
                'setColor', 'setHighlight', 'setFontSize', 'setFontFamily',
                'setAlignment', 'undo', 'redo',
                'insertText', 'insertNode', 'clearAll',
            ] as const;

            for (const cmd of expectedCommands) {
                expect(
                    typeof result.current.commands[cmd],
                    `commands.${cmd} should be a function`,
                ).toBe('function');
            }
        });
    });

    // ── state ─────────────────────────────────────────────────────────────────

    describe('state', () => {
        it('reflects the defaultValue passed to EditorProvider', () => {
            const initial = createEmptyState();
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(initial),
            });

            expect(result.current.state.doc.type).toBe('doc');
            expect(result.current.state.selection).toBeNull();
        });

        it('initialises with a valid doc tree when no defaultValue provided', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(),
            });

            const firstChild = result.current.state.doc.children?.[0];
            expect(firstChild?.type).toBe('paragraph');
            expect(firstChild?.children?.[0]?.type).toBe('text');
        });
    });

    // ── commands stability ────────────────────────────────────────────────────

    describe('commands stability', () => {
        it('commands object reference is stable across re-renders', () => {
            const { result, rerender } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(),
            });

            const commandsBefore = result.current.commands;
            rerender();
            expect(result.current.commands).toBe(commandsBefore);
        });

        it('individual command references are stable across re-renders', () => {
            const { result, rerender } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(),
            });

            const boldBefore = result.current.commands.bold;
            rerender();
            expect(result.current.commands.bold).toBe(boldBefore);
        });
    });

    // ── isActive ──────────────────────────────────────────────────────────────

    describe('isActive', () => {
        it('returns false when there is no selection', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(createEmptyState()),
            });

            expect(result.current.isActive('bold')).toBe(false);
        });

        it('returns true when the selected text node has the mark', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(makeStateWithBold()),
            });

            expect(result.current.isActive('bold')).toBe(true);
        });

        it('returns false for a mark not present on the selected node', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(makeStateWithBold()),
            });

            expect(result.current.isActive('italic')).toBe(false);
        });

        it('returns true for mark in storedMarks on collapsed selection', () => {
            const state: EditorState = {
                ...createEmptyState(),
                selection: {
                    anchor: { nodeId: 'any', offset: 0 },
                    focus: { nodeId: 'any', offset: 0 },
                    isCollapsed: true,
                },
                storedMarks: [{ type: 'italic' }],
            };

            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(state),
            });

            expect(result.current.isActive('italic')).toBe(true);
        });
    });

    // ── getAttributes ─────────────────────────────────────────────────────────

    describe('getAttributes', () => {
        it('returns null when there is no selection', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(),
            });

            expect(result.current.getAttributes('color')).toBeNull();
        });

        it('returns attrs from storedMarks on collapsed selection', () => {
            const state: EditorState = {
                ...createEmptyState(),
                selection: {
                    anchor: { nodeId: 'any', offset: 0 },
                    focus: { nodeId: 'any', offset: 0 },
                    isCollapsed: true,
                },
                storedMarks: [{ type: 'color', attrs: { color: '#ff0000' } }],
            };

            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(state),
            });

            expect(result.current.getAttributes('color')).toEqual({ color: '#ff0000' });
        });

        it('returns null for a mark with no attrs', () => {
            const { result } = renderHook(() => useEditor(), {
                wrapper: makeWrapper(makeStateWithBold()),
            });

            expect(result.current.getAttributes('bold')).toBeNull();
        });
    });

    // ── commands dispatch ─────────────────────────────────────────────────────

    describe('commands dispatch', () => {
        it('bold command calls onChange with new state in controlled mode', () => {
            const initial = makeStateWithBold();
            const { Wrapper, onChange } = makeControlledWrapper(initial);

            const { result } = renderHook(() => useEditor(), { wrapper: Wrapper });

            act(() => { result.current.commands.bold(); });

            expect(onChange).toHaveBeenCalledOnce();
            const newState: EditorState = onChange.mock.calls[0]![0]!;
            expect(newState).not.toBe(initial);
        });

        it('undo is a no-op when history is empty', () => {
            const { Wrapper, onChange } = makeControlledWrapper(createEmptyState());

            const { result } = renderHook(() => useEditor(), { wrapper: Wrapper });

            act(() => { result.current.commands.undo(); });

            expect(onChange).not.toHaveBeenCalled();
        });

        it('redo is a no-op when future is empty', () => {
            const { Wrapper, onChange } = makeControlledWrapper(createEmptyState());

            const { result } = renderHook(() => useEditor(), { wrapper: Wrapper });

            act(() => { result.current.commands.redo(); });

            expect(onChange).not.toHaveBeenCalled();
        });

        it('undo calls onChange when history has past entries', () => {
            const snapshot = createEmptyState();
            const stateWithHistory: EditorState = {
                ...createEmptyState(),
                history: {
                    past: [{ state: { ...snapshot, history: { past: [], future: [] } }, timestamp: Date.now() }],
                    future: [],
                },
            };

            const { Wrapper, onChange } = makeControlledWrapper(stateWithHistory);
            const { result } = renderHook(() => useEditor(), { wrapper: Wrapper });

            act(() => { result.current.commands.undo(); });

            expect(onChange).toHaveBeenCalledOnce();
        });
    });
});