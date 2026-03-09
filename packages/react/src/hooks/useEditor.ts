/**
 * Hook to access the editor instance with commands.
 * @package @xy-editor/react
 * @module hooks/useEditor
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useEditorContext } from '../context/EditorContext';
import {
    addMark,
    toggleMark,
    isMarkActiveInSelection,
    undo as coreUndo,
    redo as coreRedo,
} from '@xy-editor/core';
import { generateId } from '@xy-editor/core';
import type { MarkType, EditorNode, EditorState, Transaction } from '@xy-editor/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorConfig {
    /** Optional node ID for the editor DOM element */
    editorNodeId?: string;
}

export interface EditorCommands {
    // Marks
    bold: () => void;
    italic: () => void;
    underline: () => void;
    strike: () => void;
    code: () => void;
    setColor: (hex: string) => void;
    setHighlight: (hex: string) => void;
    setFontSize: (size: number) => void;
    setFontFamily: (family: string) => void;
    // Alignment
    setAlignment: (align: 'left' | 'center' | 'right' | 'justify') => void;
    // History
    undo: () => void;
    redo: () => void;
    // Content
    insertText: (text: string) => void;
    insertNode: (node: EditorNode) => void;
    clearAll: () => void;
}

export interface EditorInstance {
    state: EditorState;
    commands: EditorCommands;
    isActive: (markType: MarkType) => boolean;
    getAttributes: (markType: MarkType) => Record<string, unknown> | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to access the editor instance with commands.
 *
 * All command references are stable — they do not change on every render,
 * so components wrapped in React.memo that receive a command as a prop
 * will not re-render unnecessarily.
 *
 * @example
 * ```tsx
 * const { commands, isActive } = useEditor();
 *
 * return (
 *   <button
 *     onClick={() => commands.bold()}
 *     data-active={isActive('bold')}
 *   >
 *     Bold
 *   </button>
 * );
 * ```
 */
export function useEditor(_config?: EditorConfig): EditorInstance {
    const { state, dispatch, setState } = useEditorContext();

    // ── Stable state ref ──────────────────────────────────────────────────────
    // Commands close over stateRef.current rather than state directly.
    // This means commands are created once (stable refs) but always operate
    // on the latest state — no stale closure bugs.
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Builds a setNode transaction targeting the current selection.
     * Used for font size, font family, and alignment commands.
     */
    const makeSetNodeTransaction = useCallback(
        (data: Record<string, unknown>): Transaction => {
            const current = stateRef.current;
            return {
                id: generateId(),
                steps: [
                    {
                        type: 'setNode',
                        data,
                        position: current.selection
                            ? {
                                anchor: current.selection.anchor,
                                focus: current.selection.focus,
                            }
                            : undefined,
                    },
                ],
            };
        },
        [], // stable — reads from ref, no deps needed
    );

    // ── Commands ──────────────────────────────────────────────────────────────
    // Each command dispatches internally and returns void.
    // deps array only includes stable values (dispatch, setState, makeSetNodeTransaction)
    // so the commands object reference is stable across renders.

    const commands = useMemo<EditorCommands>(
        () => ({
            // ── Mark commands ────────────────────────────────────────────────
            bold: () => dispatch(toggleMark(stateRef.current, 'bold')),
            italic: () => dispatch(toggleMark(stateRef.current, 'italic')),
            underline: () => dispatch(toggleMark(stateRef.current, 'underline')),
            strike: () => dispatch(toggleMark(stateRef.current, 'strikethrough')),
            code: () => dispatch(toggleMark(stateRef.current, 'code')),
            setColor: (hex: string) =>
                dispatch(addMark(stateRef.current, 'color', { color: hex })),
            setHighlight: (hex: string) =>
                dispatch(addMark(stateRef.current, 'highlight', { color: hex })),

            // ── Node attribute commands ──────────────────────────────────────
            // These use setNode steps to update block/inline attrs
            // rather than marks, since font/alignment apply to nodes not spans.
            setFontSize: (size: number) =>
                dispatch(makeSetNodeTransaction({ fontSize: size })),
            setFontFamily: (family: string) =>
                dispatch(makeSetNodeTransaction({ fontFamily: family })),
            setAlignment: (align: 'left' | 'center' | 'right' | 'justify') =>
                dispatch(makeSetNodeTransaction({ alignment: align })),

            // ── History commands ─────────────────────────────────────────────
            // undo/redo replace state wholesale — they do NOT go through
            // applyTransaction because they need to restore a previous snapshot,
            // not apply incremental steps. setState bypasses applyTransaction.
            undo: () => {
                const newState = coreUndo(stateRef.current);
                if (newState) setState(newState);
            },
            redo: () => {
                const newState = coreRedo(stateRef.current);
                if (newState) setState(newState);
            },

            // ── Content commands ─────────────────────────────────────────────
            insertText: (text: string) => {
                const current = stateRef.current;
                dispatch({
                    id: generateId(),
                    steps: [
                        {
                            type: 'insertText',
                            data: { text },
                            position: current.selection
                                ? {
                                    anchor: current.selection.anchor,
                                    focus: current.selection.focus,
                                }
                                : undefined,
                        },
                    ],
                });
            },

            insertNode: (node: EditorNode) => {
                const current = stateRef.current;
                dispatch({
                    id: generateId(),
                    steps: [
                        {
                            type: 'insertNode',
                            node,
                            position: current.selection
                                ? {
                                    anchor: current.selection.anchor,
                                    focus: current.selection.focus,
                                }
                                : undefined,
                        },
                    ],
                });
            },

            clearAll: () => {
                dispatch({
                    id: generateId(),
                    steps: [{ type: 'deleteNode' }],
                });
            },
        }),
        [dispatch, setState, makeSetNodeTransaction],
        // ↑ stable deps only — commands object reference stays stable across renders
    );

    // ── isActive ──────────────────────────────────────────────────────────────
    // Delegates to core's isMarkActiveInSelection which correctly traverses
    // the document tree for range selections and checks storedMarks for carets.
    const isActive = useCallback(
        (markType: MarkType): boolean => {
            return isMarkActiveInSelection(state, markType);
        },
        [state],
    );

    // ── getAttributes ─────────────────────────────────────────────────────────
    // Reads mark attributes from the current selection.
    // Checks storedMarks for collapsed selections, document tree for ranges.
    const getAttributes = useCallback(
        (markType: MarkType): Record<string, unknown> | null => {
            if (!state.selection) return null;

            // Collapsed selection — check storedMarks
            if (state.selection.isCollapsed) {
                const mark = (state.storedMarks ?? []).find((m) => m.type === markType);
                return mark?.attrs ?? null;
            }

            // Range selection — find the first matching mark in the selection
            // (attrs are typically uniform across a selection for font/color)
            const textNodes = collectTextNodesInSelection(state);
            for (const node of textNodes) {
                const mark = (node.marks ?? []).find((m) => m.type === markType);
                if (mark?.attrs) return mark.attrs;
            }

            return null;
        },
        [state],
    );

    return useMemo(
        () => ({ state, commands, isActive, getAttributes }),
        [state, commands, isActive, getAttributes],
    );
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

/**
 * Collects text nodes within the current selection range.
 * Used by getAttributes to find mark attrs in the selected content.
 */
function collectTextNodesInSelection(state: EditorState): EditorNode[] {
    const { selection, doc } = state;
    if (!selection || selection.isCollapsed) return [];

    const allTextNodes: EditorNode[] = [];
    collectTextNodes(doc, allTextNodes);

    const anchorIdx = allTextNodes.findIndex((n) => n.id === selection.anchor.nodeId);
    const focusIdx = allTextNodes.findIndex((n) => n.id === selection.focus.nodeId);

    if (anchorIdx === -1 || focusIdx === -1) return [];

    const start = Math.min(anchorIdx, focusIdx);
    const end = Math.max(anchorIdx, focusIdx);

    return allTextNodes.slice(start, end + 1);
}

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