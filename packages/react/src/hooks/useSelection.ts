/**
 * Hook to track the current selection.
 * @package @xy-editor/react
 * @module hooks/useSelection
 */

import { useState, useEffect, useRef } from 'react';
import { useEditorContext } from '../context/EditorContext';
import type { Selection } from '@xy-editor/core';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Data attribute placed on the editor's root contenteditable div */
const EDITOR_ROOT_ATTR = 'data-editor-root';

/** Data attribute placed on every rendered EditorNode element */
const NODE_ID_ATTR = 'data-node-id';

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to track the current document selection.
 *
 * Subscribes to native `selectionchange` events and converts the browser
 * Selection into the editor's Selection model using `data-node-id` attributes.
 *
 * Design decisions:
 * - The event listener is registered once (empty deps array) using a ref for
 *   any values needed inside the handler. This prevents the listener being
 *   torn down and re-registered on every state change.
 * - Selection is only tracked when it originates inside the editor root element.
 *   Clicks elsewhere on the page set selection to null.
 * - When node IDs cannot be resolved (e.g. during a React re-render), selection
 *   is set to null rather than falling back to stale state.selection.
 * - `reversed` is computed via compareDocumentPosition, which is the only
 *   reliable cross-browser way to detect a backwards selection.
 *
 * @returns The current Selection, or null if nothing is selected
 *
 * @example
 * ```tsx
 * const selection = useSelection();
 * if (selection && !selection.isCollapsed) {
 *   console.log('Range selected from', selection.anchor, 'to', selection.focus);
 * }
 * ```
 */
export function useSelection(): Selection | null {
    const { state } = useEditorContext();
    const [selection, setSelection] = useState<Selection | null>(state.selection);

    // Ref so the handler always has the latest state.selection without
    // needing it as a dependency (which would re-register the listener
    // on every state change).
    const stateSelectionRef = useRef(state.selection);
    useEffect(() => {
        stateSelectionRef.current = state.selection;
    }, [state.selection]);

    useEffect(() => {
        const handleSelectionChange = (): void => {
            const nativeSelection = window.getSelection();

            // No selection or empty selection
            if (!nativeSelection || nativeSelection.rangeCount === 0) {
                setSelection(null);
                return;
            }

            const range = nativeSelection.getRangeAt(0);

            // ── Editor boundary check ─────────────────────────────────────────
            // Ignore selections that originate outside the editor DOM.
            // Without this, clicking in other inputs or browser UI would
            // clear or corrupt the editor selection.
            const editorRoot = document.querySelector(`[${EDITOR_ROOT_ATTR}]`);
            if (!editorRoot?.contains(range.startContainer)) {
                // Selection is outside the editor — leave selection unchanged
                return;
            }

            // ── Resolve node IDs from DOM ──────────────────────────────────────
            // Walk up from the text node to find the nearest element with
            // a data-node-id attribute. Text nodes themselves don't have
            // attributes, so we use parentElement.
            const anchorElement = getNearestNodeElement(range.startContainer);
            const focusElement = getNearestNodeElement(range.endContainer);

            const anchorNodeId = anchorElement?.getAttribute(NODE_ID_ATTR);
            const focusNodeId = focusElement?.getAttribute(NODE_ID_ATTR);

            if (!anchorNodeId || !focusNodeId) {
                // Node IDs not found — DOM may not have re-rendered yet after a
                // state change. Set null rather than using stale state.selection,
                // which would create an inconsistent source of truth.
                setSelection(null);
                return;
            }

            // ── Reversed detection ────────────────────────────────────────────
            // The browser always normalises Range so startContainer ≤ endContainer.
            // To detect a backwards selection, we must compare the native
            // anchorNode/focusNode (which preserve drag direction) using
            // compareDocumentPosition.
            const isReversed = detectReversed(nativeSelection);

            const newSelection: Selection = {
                anchor: {
                    nodeId: anchorNodeId,
                    offset: range.startOffset,
                },
                focus: {
                    nodeId: focusNodeId,
                    offset: range.endOffset,
                },
                isCollapsed: nativeSelection.isCollapsed,
                reversed: isReversed,
            };

            setSelection(newSelection);
        };

        // Register once — handler reads fresh values via refs
        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []); // ← empty deps: listener registered once for the lifetime of the component

    return selection;
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

/**
 * Walks up the DOM from a node to find the nearest element
 * that has a data-node-id attribute.
 *
 * Handles both text nodes (which have no attributes) and element nodes
 * that may not directly carry the attribute.
 */
function getNearestNodeElement(node: Node): Element | null {
    const element = node.nodeType === Node.TEXT_NODE
        ? node.parentElement
        : node as Element;

    if (!element) return null;

    // Walk up until we find an element with data-node-id or hit the editor root
    let current: Element | null = element;
    while (current) {
        if (current.hasAttribute('data-node-id')) return current;
        if (current.hasAttribute(EDITOR_ROOT_ATTR)) break; // don't walk above editor
        current = current.parentElement;
    }

    return null;
}

/**
 * Detects whether a native selection is reversed (focus before anchor).
 *
 * Cannot use Range for this — the browser normalises Range so start ≤ end.
 * Must use the Selection's anchorNode/focusNode which preserve drag direction.
 * compareDocumentPosition is the reliable cross-browser approach.
 */
function detectReversed(selection: globalThis.Selection): boolean {
    const { anchorNode, focusNode, anchorOffset, focusOffset } = selection;

    if (!anchorNode || !focusNode) return false;

    // Same node — compare offsets directly
    if (anchorNode === focusNode) {
        return anchorOffset > focusOffset;
    }

    // Different nodes — use compareDocumentPosition
    const position = anchorNode.compareDocumentPosition(focusNode);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return false; // focus is after anchor → forward selection
    }

    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return true; // focus is before anchor → reversed selection
    }

    return false;
}