/**
 * Hook to track the current selection.
 * @package @xy-editor/react
 * @module hooks/useSelection
 *
 */

import { useState, useEffect, useRef } from 'react';
import { useEditorContext } from '../context/EditorContext';
import type { Selection } from '@xy-editor/core';

// ─── Constants ────────────────────────────────────────────────────────────────

const EDITOR_ROOT_ATTR = 'data-editor-root';
const NODE_ID_ATTR = 'data-node-id';

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to track the current document selection.
 *
 * Subscribes to native `selectionchange` events and converts the browser
 * Selection into the editor's Selection model using `data-node-id` attributes.
 * Also syncs with external state.selection changes (BUG-12 fix).
 *
 * @returns The current Selection, or null if nothing is selected
 */
export function useSelection(): Selection | null {
    const { state } = useEditorContext();
    const [selection, setSelection] = useState<Selection | null>(state.selection);

    // ── BUG-12 fix: sync with external state.selection changes ────────────────
    // When state is replaced wholesale (undo/redo, file ingest), state.selection
    // changes but no selectionchange DOM event fires.  This effect catches that
    // case and keeps the local selection in sync.
    //
    // We use a ref to avoid re-registering the DOM listener (whose deps array
    // is intentionally empty) while still giving it access to the flag.
    const domSelectionActiveRef = useRef(false);

    useEffect(() => {
        // Only sync if the DOM selection handler isn't the one who just updated
        // state (which would cause an unnecessary double-set).
        if (!domSelectionActiveRef.current) {
            setSelection(state.selection);
        }
        // Reset the flag after every state change — the DOM handler sets it
        // synchronously before this effect runs on the *next* state change.
        domSelectionActiveRef.current = false;
    }, [state.selection]);

    // ── Stable state ref for the DOM listener ────────────────────────────────
    // The selectionchange handler uses a ref so it doesn't need to be
    // re-registered on every state change.
    const stateSelectionRef = useRef(state.selection);
    useEffect(() => {
        stateSelectionRef.current = state.selection;
    }, [state.selection]);

    // ── Native selectionchange listener ──────────────────────────────────────
    useEffect(() => {
        const handleSelectionChange = (): void => {
            const nativeSelection = window.getSelection();

            if (!nativeSelection || nativeSelection.rangeCount === 0) {
                setSelection(null);
                return;
            }

            const range = nativeSelection.getRangeAt(0);

            const editorRoot = document.querySelector(`[${EDITOR_ROOT_ATTR}]`);
            if (!editorRoot?.contains(range.startContainer)) {
                return;
            }

            const anchorElement = getNearestNodeElement(range.startContainer);
            const focusElement = getNearestNodeElement(range.endContainer);

            const anchorNodeId = anchorElement?.getAttribute(NODE_ID_ATTR);
            const focusNodeId = focusElement?.getAttribute(NODE_ID_ATTR);

            if (!anchorNodeId || !focusNodeId) {
                setSelection(null);
                return;
            }

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

            // Signal that this update came from the DOM so the sync effect
            // knows not to override it with state.selection on the next render.
            domSelectionActiveRef.current = true;
            setSelection(newSelection);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []); // empty deps: listener registered once for the component lifetime

    return selection;
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

function getNearestNodeElement(node: Node): Element | null {
    const element = node.nodeType === Node.TEXT_NODE
        ? node.parentElement
        : node as Element;

    if (!element) return null;

    let current: Element | null = element;
    while (current) {
        if (current.hasAttribute('data-node-id')) return current;
        if (current.hasAttribute(EDITOR_ROOT_ATTR)) break;
        current = current.parentElement;
    }

    return null;
}

function detectReversed(selection: globalThis.Selection): boolean {
    const { anchorNode, focusNode, anchorOffset, focusOffset } = selection;

    if (!anchorNode || !focusNode) return false;

    if (anchorNode === focusNode) {
        return anchorOffset > focusOffset;
    }

    const position = anchorNode.compareDocumentPosition(focusNode);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return false;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return true;

    return false;
}