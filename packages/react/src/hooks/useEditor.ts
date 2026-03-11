/**
 * Hook to access the editor instance with commands.
 * @package @xy-editor/react
 * @module hooks/useEditor
 *
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
import type { MarkType, EditorNode, EditorState, Transaction, SelectionPoint } from '@xy-editor/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorConfig {
    editorNodeId?: string;
}

export interface EditorCommands {
    bold: () => void;
    italic: () => void;
    underline: () => void;
    strike: () => void;
    code: () => void;
    setColor: (hex: string) => void;
    setHighlight: (hex: string) => void;
    setFontSize: (size: number) => void;
    setFontFamily: (family: string) => void;
    setAlignment: (align: 'left' | 'center' | 'right' | 'justify') => void;
    undo: () => void;
    redo: () => void;
    insertText: (text: string) => void;
    insertNode: (node: EditorNode) => void;
    clearAll: () => void;
}

export interface EditorInstance {
    state: EditorState;
    commands: EditorCommands;
    /** Returns true when the given mark is active across the entire selection. */
    isActive: (markType: MarkType) => boolean;
    /**
     * Returns the attrs object of a MARK on the current selection, or null.
     * Use this for inline mark attributes: color, highlight.
     *
     * @example
     * const color = getAttributes('color')?.color ?? null;
     */
    getAttributes: (markType: MarkType) => Record<string, unknown> | null;
    /**
     * Returns the value of a BLOCK NODE attribute at the current cursor
     * position, or undefined when no matching block or key is found.
     * Use this for block-level attributes: fontSize, fontFamily, alignment.
     *
     * @example
     * const size   = getNodeAttribute('fontSize')  as number  ?? 16;
     * const family = getNodeAttribute('fontFamily') as string ?? 'sans-serif';
     * const align  = getNodeAttribute('alignment')  as string ?? 'left';
     */
    getNodeAttribute: (key: string) => unknown;
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
 * const { commands, isActive, getNodeAttribute } = useEditor();
 *
 * return (
 *   <>
 *     <button onClick={commands.bold} data-active={isActive('bold')}>Bold</button>
 *     <select value={getNodeAttribute('fontFamily') as string ?? ''}>…</select>
 *   </>
 * );
 * ```
 */
export function useEditor(_config?: EditorConfig): EditorInstance {
    const { state, dispatch, setState } = useEditorContext();

    // ── Stable state ref ──────────────────────────────────────────────────────
    // Commands read stateRef.current so they always operate on the latest state
    // without needing state as a dependency — this keeps command refs stable.
    const stateRef = useRef<EditorState>(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // ── makeSetNodeTransaction ────────────────────────────────────
    //
    // Resolves the setNode target to the BLOCK ancestor of the anchor text node.
    //
    // Why this matters:
    //   selection.anchor.nodeId always points to a type:'text' leaf because
    //   selections are always placed inside text content.  Block-level
    //   attributes (fontSize, fontFamily, alignment) must live on the parent
    //   block (paragraph, heading, listItem…), not on the text leaf.
    //   Writing them to the text leaf means no renderer or getNodeAttribute
    //   call that inspects paragraph.attrs will ever see them.
    //
    // Resolution order:
    //   1. Use selection.anchor if a selection exists → find its block ancestor.
    //   2. Fall back to the first text node in the doc → find its block ancestor.
    //   3. If no block can be found (malformed doc), return a no-op transaction.
    const makeSetNodeTransaction = useCallback(
        (data: Record<string, unknown>): Transaction => {
            const current = stateRef.current;

            const anchorNodeId =
                current.selection?.anchor.nodeId ??
                findFirstTextNode(current.doc)?.id;

            if (!anchorNodeId) {
                // Malformed document — nothing to target
                return { id: generateId(), steps: [] };
            }

            // Walk up from the text leaf to the nearest non-text block container
            const blockNode = findNearestBlock(current.doc, anchorNodeId);

            if (!blockNode) {
                // No block ancestor found — no-op
                return { id: generateId(), steps: [] };
            }

            const position: { anchor: SelectionPoint; focus: SelectionPoint } = {
                anchor: { nodeId: blockNode.id, offset: 0 },
                focus: { nodeId: blockNode.id, offset: 0 },
            };

            return {
                id: generateId(),
                steps: [{ type: 'setNode', data, position }],
            };
        },
        [], // reads from ref only — no deps needed
    );

    // ── Commands ──────────────────────────────────────────────────────────────

    const commands = useMemo<EditorCommands>(
        () => ({
            // ── Mark commands ────────────────────────────────────────────────
            //
            // All inline marks share the same three-way dispatch:
            //
            //   selection === null        → no caret at all (Storybook / no canvas)
            //   selection.isCollapsed     → caret placed, no text range selected
            //   selection is a range      → text is selected
            //
            // For toggle marks (bold, italic, underline, strike, code):
            //   null       → no-op. There is no caret to anchor the intent to.
            //   collapsed  → toggleStoredMark: queue the mark for the next typed
            //                character.  This is the standard behaviour — pressing
            //                Cmd+B with a caret placed arms bold for what you type
            //                next, exactly as Word / Google Docs behave.
            //   range      → dispatch toggleMark: apply to the selected text.
            //
            // For set marks (setColor, setHighlight):
            //   null       → setStoredMark: even without a caret we update
            //                storedMarks so the color indicator reflects the choice
            //                immediately (important for Storybook / bare toolbar).
            //   collapsed  → setStoredMark: same as null — queue for next char.
            //   range      → dispatch addMark: apply to the selected text.
            //
            // Why storedMarks — not a dispatch — for the collapsed/null cases:
            //   core's toggleMark / addMark both call requirePosition(), which
            //   throws when selection is null or treats a collapsed selection as
            //   having nothing to mark.  storedMarks is the core's own mechanism
            //   for exactly this situation: insertText consumes them and merges
            //   them onto the newly typed text node.
            bold: () => {
                const current = stateRef.current;
                if (!current.selection) return;
                if (current.selection.isCollapsed) {
                    setState(toggleStoredMark(current, 'bold'));
                    return;
                }
                dispatch(toggleMark(current, 'bold'));
            },
            italic: () => {
                const current = stateRef.current;
                if (!current.selection) return;
                if (current.selection.isCollapsed) {
                    setState(toggleStoredMark(current, 'italic'));
                    return;
                }
                dispatch(toggleMark(current, 'italic'));
            },
            underline: () => {
                const current = stateRef.current;
                if (!current.selection) return;
                if (current.selection.isCollapsed) {
                    setState(toggleStoredMark(current, 'underline'));
                    return;
                }
                dispatch(toggleMark(current, 'underline'));
            },
            strike: () => {
                const current = stateRef.current;
                if (!current.selection) return;
                if (current.selection.isCollapsed) {
                    setState(toggleStoredMark(current, 'strikethrough'));
                    return;
                }
                dispatch(toggleMark(current, 'strikethrough'));
            },
            code: () => {
                const current = stateRef.current;
                if (!current.selection) return;
                if (current.selection.isCollapsed) {
                    setState(toggleStoredMark(current, 'code'));
                    return;
                }
                dispatch(toggleMark(current, 'code'));
            },
            setColor: (hex: string) => {
                const current = stateRef.current;
                if (!current.selection || current.selection.isCollapsed) {
                    setState(setStoredMark(current, 'color', { color: hex }));
                    return;
                }
                dispatch(addMark(current, 'color', { color: hex }));
            },
            setHighlight: (hex: string) => {
                const current = stateRef.current;
                if (!current.selection || current.selection.isCollapsed) {
                    setState(setStoredMark(current, 'highlight', { color: hex }));
                    return;
                }
                dispatch(addMark(current, 'highlight', { color: hex }));
            },

            // ── Node attribute commands ──────────────────────────────────────
            // These target the block ancestor (SB-02 fix via makeSetNodeTransaction).
            // No selection guard needed — makeSetNodeTransaction falls back to the
            // first text node in the doc when selection is null, so font/alignment
            // changes work even in Storybook stories without a canvas.
            setFontSize: (size: number) =>
                dispatch(makeSetNodeTransaction({ fontSize: size })),
            setFontFamily: (family: string) =>
                dispatch(makeSetNodeTransaction({ fontFamily: family })),
            setAlignment: (align: 'left' | 'center' | 'right' | 'justify') =>
                dispatch(makeSetNodeTransaction({ alignment: align })),

            // ── History commands ─────────────────────────────────────────────
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
                    steps: [{
                        type: 'insertText',
                        data: { text },
                        position: current.selection
                            ? {
                                anchor: current.selection.anchor,
                                focus: current.selection.focus,
                            }
                            : undefined,
                    }],
                });
            },

            insertNode: (node: EditorNode) => {
                const current = stateRef.current;
                dispatch({
                    id: generateId(),
                    steps: [{
                        type: 'insertNode',
                        node,
                        position: current.selection
                            ? {
                                anchor: current.selection.anchor,
                                focus: current.selection.focus,
                            }
                            : undefined,
                    }],
                });
            },

            clearAll: () => {
                dispatch({
                    id: generateId(),
                    steps: [{ type: 'clearDoc' }],
                });
            },
        }),
        [dispatch, setState, makeSetNodeTransaction],
    );

    // ── isActive ──────────────────────────────────────────────────────────────
    // Delegates to core's isMarkActiveInSelection which checks storedMarks for
    // collapsed selections and traverses the document tree for range selections.
    const isActive = useCallback(
        (markType: MarkType): boolean => isMarkActiveInSelection(state, markType),
        [state],
    );

    // ── getAttributes (mark attrs only) ───────────────────────────────────────
    // Reads the attrs object of an inline MARK on the current selection.
    // Only covers mark-based attributes: color, highlight.
    // For block-level attributes use getNodeAttribute() instead.
    //
    // Priority order:
    //   1. storedMarks are always checked first — they are queued marks for the
    //      next typed character and are the source of truth when nothing is
    //      selected (e.g. Storybook with no canvas, or after setColor was called
    //      with no active selection).  This makes the color indicator update
    //      immediately after the user picks a color, even with no text selected.
    //   2. No selection and no storedMarks → null.
    //   3. Collapsed caret — storedMarks already checked; nothing else to read.
    //   4. Range selection — walk text nodes in range and return the first match.
    const getAttributes = useCallback(
        (markType: MarkType): Record<string, unknown> | null => {
            // Step 1: storedMarks — valid regardless of selection state
            const stored = (state.storedMarks ?? []).find((m) => m.type === markType);
            if (stored?.attrs) return stored.attrs;

            // Step 2: no selection at all — nothing more to check
            if (!state.selection) return null;

            // Step 3: collapsed caret — storedMarks already exhausted above
            if (state.selection.isCollapsed) return null;

            // Step 4: range selection — first matching text node in the range
            const textNodes = collectTextNodesInSelection(state);
            for (const node of textNodes) {
                const mark = (node.marks ?? []).find((m) => m.type === markType);
                if (mark?.attrs) return mark.attrs;
            }

            return null;
        },
        [state],
    );

    // ── getNodeAttribute (block attrs only — SB-03 fix) ───────────────────────
    //
    // Reads a single attribute from the BLOCK CONTAINER that holds the current
    // cursor position.  This is the correct read path for fontSize, fontFamily,
    // and alignment because those values live in block.attrs, not in marks[].
    //
    // Resolution:
    //   1. Prefer selection.anchor to find the current block.
    //   2. Fall back to the first text node's block ancestor when no selection.
    //   3. Return undefined if no block or key is found.
    //
    // Usage in toolbar components:
    //   const family = getNodeAttribute('fontFamily') as string | undefined;
    //   const size   = getNodeAttribute('fontSize')   as number | undefined;
    //   const align  = getNodeAttribute('alignment')  as string | undefined;
    const getNodeAttribute = useCallback(
        (key: string): unknown => {
            const anchorNodeId =
                state.selection?.anchor.nodeId ??
                findFirstTextNode(state.doc)?.id;

            if (!anchorNodeId) return undefined;

            const blockNode = findNearestBlock(state.doc, anchorNodeId);
            return blockNode?.attrs?.[key];
        },
        [state],
    );

    return { state, commands, isActive, getAttributes, getNodeAttribute };
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

/**
 * Finds the nearest block-level ancestor of `nodeId`.
 *
 * A "block" is any node whose type is not 'text' — i.e. paragraph, heading,
 * listItem, blockquote, codeBlock, tableRow, etc.
 *
 * If `nodeId` itself is already a block (not a text leaf), returns that node.
 * If `nodeId` is a text leaf, returns its parent.
 * Returns undefined if the node cannot be found in the tree.
 */
function findNearestBlock(
    doc: EditorNode,
    nodeId: string,
): EditorNode | undefined {
    const node = findNodeById(doc, nodeId);

    // Already a block — return it directly
    if (node && node.type !== 'text') return node;

    // Text leaf — return its parent block
    return findParentNode(doc, nodeId);
}

/**
 * Finds a node by ID anywhere in the tree.
 */
function findNodeById(root: EditorNode, id: string): EditorNode | undefined {
    if (root.id === id) return root;
    for (const child of root.children ?? []) {
        const found = findNodeById(child, id);
        if (found) return found;
    }
    return undefined;
}

/**
 * Finds the direct parent of `targetId` anywhere in the tree.
 */
function findParentNode(
    root: EditorNode,
    targetId: string,
): EditorNode | undefined {
    for (const child of root.children ?? []) {
        if (child.id === targetId) return root;
        const found = findParentNode(child, targetId);
        if (found) return found;
    }
    return undefined;
}

/**
 * Collects text nodes within the current selection range.
 * Returns an empty array for collapsed (caret) selections.
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
    for (const child of node.children ?? []) {
        collectTextNodes(child, result);
    }
}

function findFirstTextNode(node: EditorNode): EditorNode | undefined {
    if (node.type === 'text') return node;
    for (const child of node.children ?? []) {
        const found = findFirstTextNode(child);
        if (found) return found;
    }
    return undefined;
}
/**
 * Returns a new EditorState with `mark` upserted into `state.storedMarks`.
 *
 * Used by setColor / setHighlight when selection is null or collapsed — there
 * is no text range to apply the mark to, so we queue it in storedMarks instead.
 * insertText consumes storedMarks and merges them onto the inserted text node

 *
 * If a mark of the same type already exists it is replaced (set marks always
 * carry attrs, so "toggling" doesn't make sense — the new value wins).
 * All other state fields are preserved by reference.
 */
function setStoredMark(
    state: EditorState,
    type: string,
    attrs: Record<string, unknown>,
): EditorState {
    const existing = state.storedMarks ?? [];
    const filtered = existing.filter((m) => m.type !== type);
    return {
        ...state,
        storedMarks: [...filtered, { type, attrs }],
    };
}

/**
 * Returns a new EditorState with `type` toggled in `state.storedMarks`.
 *
 * Used by bold / italic / underline / strike / code when selection is collapsed
 * — there is no text range to apply the mark to, so we queue the intent in
 * storedMarks.  insertText consumes storedMarks and merges them onto the
 * inserted text node 
 *
 * Unlike setStoredMark, toggle marks carry no meaningful attrs ({}) so the
 * correct behaviour is on/off: if the mark is already queued, remove it;
 * otherwise add it.  This mirrors what Cmd+B does in Word / Google Docs when
 * the caret is placed — pressing it twice cancels the intent.
 */
function toggleStoredMark(state: EditorState, type: MarkType): EditorState {
    const existing = state.storedMarks ?? [];
    const alreadyQueued = existing.some((m) => m.type === type);
    return {
        ...state,
        storedMarks: alreadyQueued
            ? existing.filter((m) => m.type !== type)   // second press cancels
            : [...existing, { type, attrs: {} }],        // first press arms it
    };
}