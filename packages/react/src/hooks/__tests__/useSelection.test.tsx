/**
 * Tests for useSelection hook
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../useSelection';
import { createEmptyState } from '@xy-editor/core';
import { makeWrapper } from './utils';
import type { EditorState, Selection } from '@xy-editor/core';

// ─── Constants ────────────────────────────────────────────────────────────────

const EDITOR_ROOT_ATTR = 'data-editor-root';
const NODE_ID_ATTR = 'data-node-id';

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

/**
 * Creates a minimal editor DOM:
 *   <div data-editor-root>
 *     <span data-node-id="anchorId">Hello</span>
 *     <span data-node-id="focusId">World</span>
 *   </div>
 */
function createEditorDOM(anchorId: string, focusId: string) {
    const root = document.createElement('div');
    root.setAttribute(EDITOR_ROOT_ATTR, '');

    const anchorEl = document.createElement('span');
    anchorEl.setAttribute(NODE_ID_ATTR, anchorId);
    anchorEl.textContent = 'Hello';

    const focusEl = document.createElement('span');
    focusEl.setAttribute(NODE_ID_ATTR, focusId);
    focusEl.textContent = 'World';

    root.appendChild(anchorEl);
    root.appendChild(focusEl);
    document.body.appendChild(root);

    return { root, anchorEl, focusEl };
}

/**
 * Mocks window.getSelection() with controlled anchor/focus nodes and offsets.
 */
function mockNativeSelection({
    anchorNode,
    focusNode,
    anchorOffset = 0,
    focusOffset = 5,
    isCollapsed = false,
    rangeCount = 1,
    startContainer,
    endContainer,
    startOffset = 0,
    endOffset = 5,
}: {
    anchorNode: Node | null;
    focusNode: Node | null;
    anchorOffset?: number;
    focusOffset?: number;
    isCollapsed?: boolean;
    rangeCount?: number;
    startContainer?: Node | null;
    endContainer?: Node | null;
    startOffset?: number;
    endOffset?: number;
}) {
    const range: Partial<Range> = {
        startContainer: (startContainer ?? anchorNode ?? document.body) as Node,
        endContainer: (endContainer ?? focusNode ?? document.body) as Node,
        startOffset,
        endOffset,
        collapsed: isCollapsed,
    };

    const selection: Partial<globalThis.Selection> = {
        rangeCount,
        isCollapsed,
        anchorNode,
        focusNode,
        anchorOffset,
        focusOffset,
        getRangeAt: vi.fn().mockReturnValue(range),
    };

    vi.spyOn(window, 'getSelection').mockReturnValue(
        selection as globalThis.Selection,
    );

    return { range, selection };
}

function fireSelectionChange() {
    act(() => {
        document.dispatchEvent(new Event('selectionchange'));
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useSelection', () => {

    beforeEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    // ── Initial state ─────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('returns null when state.selection is null', () => {
            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(createEmptyState()),
            });

            expect(result.current).toBeNull();
        });

        it('initialises from state.selection when provided', () => {
            const selection: Selection = {
                anchor: { nodeId: 'node1', offset: 0 },
                focus: { nodeId: 'node1', offset: 5 },
                isCollapsed: false,
            };

            const state: EditorState = { ...createEmptyState(), selection };

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(state),
            });

            expect(result.current).toEqual(selection);
        });
    });

    // ── selectionchange events ────────────────────────────────────────────────

    describe('selectionchange handling', () => {
        it('returns null when getSelection returns null', () => {
            vi.spyOn(window, 'getSelection').mockReturnValue(null);

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current).toBeNull();
        });

        it('returns null when rangeCount is 0', () => {
            mockNativeSelection({ anchorNode: null, focusNode: null, rangeCount: 0 });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current).toBeNull();
        });

        it('updates selection when selectionchange fires inside editor root', () => {
            const anchorId = 'anchor-node';
            const focusId = 'focus-node';
            const { anchorEl, focusEl } = createEditorDOM(anchorId, focusId);

            const anchorText = anchorEl.firstChild!;
            const focusText = focusEl.firstChild!;

            mockNativeSelection({
                anchorNode: anchorText,
                focusNode: focusText,
                anchorOffset: 0,
                focusOffset: 5,
                startContainer: anchorText,
                endContainer: focusText,
            });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current).not.toBeNull();
            expect(result.current?.anchor.nodeId).toBe(anchorId);
            expect(result.current?.focus.nodeId).toBe(focusId);
            expect(result.current?.anchor.offset).toBe(0);
            expect(result.current?.focus.offset).toBe(5);
        });

        it('sets isCollapsed: true for a caret selection', () => {
            const nodeId = 'caret-node';
            const { anchorEl } = createEditorDOM(nodeId, nodeId);
            const textNode = anchorEl.firstChild!;

            mockNativeSelection({
                anchorNode: textNode,
                focusNode: textNode,
                anchorOffset: 3,
                focusOffset: 3,
                isCollapsed: true,
                startContainer: textNode,
                endContainer: textNode,
                startOffset: 3,
                endOffset: 3,
            });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current?.isCollapsed).toBe(true);
            expect(result.current?.anchor.offset).toBe(3);
        });
    });

    // ── Editor boundary ───────────────────────────────────────────────────────

    describe('editor boundary', () => {
        it('does not update selection when event fires outside editor root', () => {
            const outsideEl = document.createElement('input');
            document.body.appendChild(outsideEl);

            mockNativeSelection({
                anchorNode: outsideEl,
                focusNode: outsideEl,
                startContainer: outsideEl,
                endContainer: outsideEl,
            });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            const selectionBefore = result.current;
            fireSelectionChange();

            expect(result.current).toBe(selectionBefore);
        });
    });

    // ── Node ID resolution ────────────────────────────────────────────────────

    describe('node ID resolution', () => {
        it('sets null when node IDs cannot be resolved', () => {
            const root = document.createElement('div');
            root.setAttribute(EDITOR_ROOT_ATTR, '');
            const el = document.createElement('span'); // no data-node-id
            el.textContent = 'text';
            root.appendChild(el);
            document.body.appendChild(root);

            mockNativeSelection({
                anchorNode: el.firstChild,
                focusNode: el.firstChild,
                startContainer: el.firstChild,
                endContainer: el.firstChild,
            });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current).toBeNull();
        });

        it('resolves node ID by walking up the DOM tree', () => {
            const nodeId = 'grandparent-node';
            const root = document.createElement('div');
            root.setAttribute(EDITOR_ROOT_ATTR, '');

            const grandparent = document.createElement('div');
            grandparent.setAttribute(NODE_ID_ATTR, nodeId);

            const parent = document.createElement('span');
            const textNode = document.createTextNode('hello');
            parent.appendChild(textNode);
            grandparent.appendChild(parent);
            root.appendChild(grandparent);
            document.body.appendChild(root);

            mockNativeSelection({
                anchorNode: textNode,
                focusNode: textNode,
                startContainer: textNode,
                endContainer: textNode,
            });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current?.anchor.nodeId).toBe(nodeId);
        });
    });

    // ── Reversed detection ────────────────────────────────────────────────────

    describe('reversed detection', () => {
        it('reversed is false for a forward selection', () => {
            const { anchorEl, focusEl } = createEditorDOM('anchor-node', 'focus-node');

            mockNativeSelection({
                anchorNode: anchorEl.firstChild,
                focusNode: focusEl.firstChild,
                startContainer: anchorEl.firstChild,
                endContainer: focusEl.firstChild,
            });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current?.reversed).toBe(false);
        });

        it('reversed is true when anchorOffset > focusOffset on the same node', () => {
            const { anchorEl } = createEditorDOM('same-node', 'same-node');
            const textNode = anchorEl.firstChild!;

            mockNativeSelection({
                anchorNode: textNode,
                focusNode: textNode,
                anchorOffset: 5,
                focusOffset: 2,
                startContainer: textNode,
                endContainer: textNode,
                startOffset: 2,
                endOffset: 5,
            });

            const { result } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            fireSelectionChange();

            expect(result.current?.reversed).toBe(true);
        });
    });

    // ── Event listener lifecycle ──────────────────────────────────────────────

    describe('event listener lifecycle', () => {
        it('registers selectionchange listener once on mount', () => {
            const addSpy = vi.spyOn(document, 'addEventListener');

            renderHook(() => useSelection(), { wrapper: makeWrapper() });

            const count = addSpy.mock.calls.filter(([e]) => e === 'selectionchange').length;
            expect(count).toBe(1);
        });

        it('removes selectionchange listener on unmount', () => {
            const removeSpy = vi.spyOn(document, 'removeEventListener');

            const { unmount } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            unmount();

            const count = removeSpy.mock.calls.filter(([e]) => e === 'selectionchange').length;
            expect(count).toBe(1);
        });

        it('does not re-register listener on re-render', () => {
            const addSpy = vi.spyOn(document, 'addEventListener');

            const { rerender } = renderHook(() => useSelection(), {
                wrapper: makeWrapper(),
            });

            const countAfterMount = addSpy.mock.calls.filter(
                ([e]) => e === 'selectionchange'
            ).length;

            rerender();
            rerender();

            const countAfterRerenders = addSpy.mock.calls.filter(
                ([e]) => e === 'selectionchange'
            ).length;

            // Must not increase — listener registered exactly once
            expect(countAfterRerenders).toBe(countAfterMount);
        });
    });
});