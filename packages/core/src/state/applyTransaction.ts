/**
 * Applies a transaction to the editor state.
 * @package @xy-editor/core
 * @module state/applyTransaction
 *
 * FIXES:
 */

import type {
    EditorState,
    Transaction,
    TransformStep,
    EditorNode,
    Selection,
    HistoryEntry,
    Mark,
    SelectionPoint,
} from './types';
import { createEmptyState } from './createEmptyState';
import { generateId } from '../utils/generateId';

// ─── Tree Helpers ─────────────────────────────────────────────────────────────

/**
 * Collects all leaf text nodes from the document tree in document order.
 */
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

/**
 * Finds a node by ID anywhere in the tree.
 */
function findNode(node: EditorNode, id: string): EditorNode | undefined {
    if (node.id === id) return node;
    if (!node.children) return undefined;
    for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
    }
    return undefined;
}

/**
 * Finds a node's parent in the tree.
 */
function findParent(root: EditorNode, targetId: string): EditorNode | undefined {
    if (!root.children) return undefined;
    for (const child of root.children) {
        if (child.id === targetId) return root;
        const found = findParent(child, targetId);
        if (found) return found;
    }
    return undefined;
}

/**
 * Returns a new tree with the node matching `nodeId` replaced by `replacement`.
 * Uses structural sharing — unaffected branches return the same reference.
 */
function replaceNodeInTree(
    node: EditorNode,
    nodeId: string,
    replacement: EditorNode,
): EditorNode {
    if (node.id === nodeId) return replacement;
    if (!node.children?.length) return node;

    const newChildren = node.children.map((child) =>
        replaceNodeInTree(child, nodeId, replacement),
    );

    const changed = newChildren.some((c, i) => c !== node.children![i]);
    if (!changed) return node;

    return { ...node, children: newChildren };
}

/**
 * Returns a new tree with the node matching `nodeId` removed.
 */
function removeNodeFromTree(root: EditorNode, nodeId: string): EditorNode {
    if (!root.children?.length) return root;

    const newChildren = root.children
        .filter((child) => child.id !== nodeId)
        .map((child) => removeNodeFromTree(child, nodeId));

    const changed =
        newChildren.length !== root.children.length ||
        newChildren.some((c, i) => c !== root.children![i]);

    if (!changed) return root;
    return { ...root, children: newChildren };
}

// ─── Selection Helpers ────────────────────────────────────────────────────────

function resolveStepSelection(step: TransformStep): Selection | null {
    const anchor = step.position?.anchor;
    const focus = step.position?.focus;
    if (!anchor || !focus) return null;
    return { anchor, focus };
}

// ─── Mark Helpers (BUG-13 fix) ────────────────────────────────────────────────

function addMarkToNode(node: EditorNode, mark: Mark): EditorNode {
    const marks = node.marks ?? [];
    if (marks.some((m) => m.type === mark.type)) return node;
    return { ...node, marks: [...marks, mark] };
}

function removeMarkFromNode(node: EditorNode, markType: string): EditorNode {
    const marks = node.marks ?? [];
    const filtered = marks.filter((m) => m.type !== markType);
    if (filtered.length === marks.length) return node;
    return { ...node, marks: filtered };
}

/**
 * Applies a mark operation only to the selected character range.
 *
 * For the anchor node: only characters from anchorOffset → end are marked.
 * For the focus node:  only characters from start → focusOffset are marked.
 * Interior nodes: fully marked.
 *
 * When a boundary split is needed, the tree is updated to replace the original
 * node with [left, right] halves inserted at the same position.
 *
 * BUG-13 fix: the previous implementation applied marks to entire nodes,
 * ignoring character offsets.
 */
function applyMarkToSelection(
    doc: EditorNode,
    selection: Selection,
    transform: (node: EditorNode) => EditorNode,
): EditorNode {
    const textNodes: EditorNode[] = [];
    collectTextNodes(doc, textNodes);

    const anchorIdx = textNodes.findIndex((n) => n.id === selection.anchor.nodeId);
    const focusIdx = textNodes.findIndex((n) => n.id === selection.focus.nodeId);

    if (anchorIdx === -1 || focusIdx === -1) {
        console.warn(
            '[applyTransaction] Selection references node IDs not found in document.',
            { anchor: selection.anchor.nodeId, focus: selection.focus.nodeId },
        );
        return doc;
    }

    const start = Math.min(anchorIdx, focusIdx);
    const end = Math.max(anchorIdx, focusIdx);

    // endNode ID is saved so we can re-look it up after the tree is rebuilt
    // by earlier iterations (splitAndApplyMark replaces node IDs).
    const endNode = textNodes[end]!;
    const startOffset =
        anchorIdx <= focusIdx ? selection.anchor.offset : selection.focus.offset;
    const endOffset =
        anchorIdx <= focusIdx ? selection.focus.offset : selection.anchor.offset;

    let newDoc = doc;

    for (let i = start; i <= end; i++) {
        const original = textNodes[i]!;
        const text = original.text ?? '';

        if (start === end) {
            // Single node: only the selected slice gets the mark.
            // We split into up to three segments: [before][selected][after].
            const lo = Math.min(startOffset, endOffset);
            const hi = Math.max(startOffset, endOffset);

            if (lo === 0 && hi >= text.length) {
                // Full node selected — simple case
                const updated = transform(original);
                if (updated !== original) {
                    newDoc = replaceNodeInTree(newDoc, original.id, updated);
                }
            } else {
                // Partial selection — split and replace
                newDoc = splitAndApplyMark(newDoc, original, lo, hi, transform);
            }
        } else if (i === start) {
            // Anchor node: mark from startOffset to end of node
            if (startOffset === 0) {
                const updated = transform(original);
                if (updated !== original) {
                    newDoc = replaceNodeInTree(newDoc, original.id, updated);
                }
            } else {
                newDoc = splitAndApplyMark(
                    newDoc, original, startOffset, text.length, transform,
                );
            }
        } else if (i === end) {
            // Focus node: mark from start of node to endOffset
            // Re-look up endNode because the tree may have been rebuilt above
            const currentEndNode = findNode(newDoc, endNode.id);
            if (!currentEndNode) continue;
            const currentText = currentEndNode.text ?? '';

            if (endOffset >= currentText.length) {
                const updated = transform(currentEndNode);
                if (updated !== currentEndNode) {
                    newDoc = replaceNodeInTree(newDoc, currentEndNode.id, updated);
                }
            } else {
                newDoc = splitAndApplyMark(
                    newDoc, currentEndNode, 0, endOffset, transform,
                );
            }
        } else {
            // Interior node: fully apply the mark
            const updated = transform(original);
            if (updated !== original) {
                newDoc = replaceNodeInTree(newDoc, original.id, updated);
            }
        }
    }

    return newDoc;
}

/**
 * Splits `node` at [lo, hi) and applies `transform` only to the middle
 * segment. The parent's children list is updated in-place (structurally).
 */
function splitAndApplyMark(
    doc: EditorNode,
    node: EditorNode,
    lo: number,
    hi: number,
    transform: (n: EditorNode) => EditorNode,
): EditorNode {
    const text = node.text ?? '';
    const parent = findParent(doc, node.id);
    if (!parent?.children) return doc;

    const segments: EditorNode[] = [];

    if (lo > 0) {
        segments.push({ ...node, id: generateId(), text: text.slice(0, lo) });
    }

    const middle: EditorNode = { ...node, id: generateId(), text: text.slice(lo, hi) };
    segments.push(transform(middle));

    if (hi < text.length) {
        segments.push({ ...node, id: generateId(), text: text.slice(hi) });
    }

    const newChildren = parent.children.flatMap((c) =>
        c.id === node.id ? segments : [c],
    );

    return replaceNodeInTree(doc, parent.id, { ...parent, children: newChildren });
}

// ─── storedMarks Helper (BUG-06 fix) ─────────────────────────────────────────

/**
 * Merges node-level marks with storedMarks.
 * storedMarks take precedence — they represent the user's explicit intent for
 * the next typed character (e.g. toggling bold with a caret selection).
 */
function mergeWithStoredMarks(
    nodeMarks: Mark[] | undefined,
    storedMarks: Mark[] | undefined,
): Mark[] | undefined {
    if (!storedMarks?.length) return nodeMarks;
    if (!nodeMarks?.length) return storedMarks;

    // storedMarks override existing marks of the same type
    const result = [...nodeMarks];
    for (const stored of storedMarks) {
        const idx = result.findIndex((m) => m.type === stored.type);
        if (idx >= 0) {
            result[idx] = stored;
        } else {
            result.push(stored);
        }
    }
    return result;
}

// ─── Step Handlers ────────────────────────────────────────────────────────────

/**
 * Result of applying a single step — the new doc plus an optional updated
 * selection (null means "keep current selection unchanged").
 */
interface StepResult {
    doc: EditorNode;
    selection: Selection | null | undefined;
    // undefined = keep existing selection
    // null      = clear selection
    clearStoredMarks?: boolean;
}

function applyStep(
    doc: EditorNode,
    step: TransformStep,
    stateSelection: Selection | null,
    storedMarks: Mark[] | undefined,
): StepResult {
    const selectionForStep = resolveStepSelection(step) ?? stateSelection;

    switch (step.type) {

        // ── Mark steps ──────────────────────────────────────────────────────

        case 'addMark': {
            if (!step.mark) {
                console.warn('[applyTransaction] addMark step is missing mark.');
                return { doc, selection: undefined };
            }
            if (!selectionForStep) {
                console.warn('[applyTransaction] addMark requires an active selection.');
                return { doc, selection: undefined };
            }
            const newDoc = applyMarkToSelection(
                doc, selectionForStep, (node) => addMarkToNode(node, step.mark!),
            );
            return { doc: newDoc, selection: undefined };
        }

        case 'removeMark': {
            if (!step.mark) {
                console.warn('[applyTransaction] removeMark step is missing mark.');
                return { doc, selection: undefined };
            }
            if (!selectionForStep) {
                console.warn('[applyTransaction] removeMark requires an active selection.');
                return { doc, selection: undefined };
            }
            const newDoc = applyMarkToSelection(
                doc, selectionForStep, (node) => removeMarkFromNode(node, step.mark!.type),
            );
            return { doc: newDoc, selection: undefined };
        }

        // ── Node attribute step ──────────────────────────────────────────────

        case 'setNode': {
            const anchor = step.position?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] setNode requires position.anchor.');
                return { doc, selection: undefined };
            }
            const target = findNode(doc, anchor.nodeId);
            if (!target) {
                console.warn(`[applyTransaction] setNode: node '${anchor.nodeId}' not found.`);
                return { doc, selection: undefined };
            }
            return {
                doc: replaceNodeInTree(doc, anchor.nodeId, {
                    ...target,
                    attrs: { ...target.attrs, ...step.data },
                }),
                selection: undefined,
            };
        }

        // ── Text insertion ───────────────────────────────────────────────────

        case 'insertText': {
            // BUG-06 fix: consume storedMarks and apply them to inserted text.
            const text = step.data?.text;
            if (typeof text !== 'string') {
                console.warn('[applyTransaction] insertText requires data.text string.');
                return { doc, selection: undefined };
            }
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] insertText requires a selection or position.');
                return { doc, selection: undefined };
            }
            const targetNode = findNode(doc, anchor.nodeId);
            if (!targetNode || targetNode.type !== 'text') {
                console.warn('[applyTransaction] insertText: target must be a text node.');
                return { doc, selection: undefined };
            }

            const before = (targetNode.text ?? '').slice(0, anchor.offset);
            const after = (targetNode.text ?? '').slice(anchor.offset);

            // Merge storedMarks onto the node's existing marks (BUG-06)
            const mergedMarks = mergeWithStoredMarks(targetNode.marks, storedMarks);

            const newDoc = replaceNodeInTree(doc, anchor.nodeId, {
                ...targetNode,
                text: before + text + after,
                ...(mergedMarks !== undefined && { marks: mergedMarks }),
            });

            // BUG-07 fix: advance cursor to end of inserted text
            const newOffset = anchor.offset + text.length;
            const newAnchor: SelectionPoint = { nodeId: anchor.nodeId, offset: newOffset };
            const newSelection: Selection = {
                anchor: newAnchor,
                focus: newAnchor,
                isCollapsed: true,
            };

            return {
                doc: newDoc,
                selection: newSelection,
                clearStoredMarks: true, // storedMarks consumed — clear them
            };
        }

        // ── Text deletion ────────────────────────────────────────────────────

        case 'deleteText': {
            const anchor = step.position?.anchor;
            const focus = step.position?.focus;
            if (!anchor || !focus) {
                console.warn('[applyTransaction] deleteText requires both anchor and focus.');
                return { doc, selection: undefined };
            }
            if (anchor.nodeId !== focus.nodeId) {
                console.warn('[applyTransaction] deleteText: cross-node deletion — use mergeNode.');
                return { doc, selection: undefined };
            }
            const targetNode = findNode(doc, anchor.nodeId);
            if (!targetNode || targetNode.type !== 'text') {
                return { doc, selection: undefined };
            }

            const startOff = Math.min(anchor.offset, focus.offset);
            const endOff = Math.max(anchor.offset, focus.offset);
            const text = targetNode.text ?? '';

            const newDoc = replaceNodeInTree(doc, anchor.nodeId, {
                ...targetNode,
                text: text.slice(0, startOff) + text.slice(endOff),
            });

            // BUG-07 fix: collapse selection to deletion start
            const collapsed: SelectionPoint = { nodeId: anchor.nodeId, offset: startOff };
            const newSelection: Selection = {
                anchor: collapsed,
                focus: collapsed,
                isCollapsed: true,
            };

            return { doc: newDoc, selection: newSelection };
        }

        // ── Node insertion ───────────────────────────────────────────────────

        case 'insertNode': {
            if (!step.node) {
                console.warn('[applyTransaction] insertNode requires a node.');
                return { doc, selection: undefined };
            }
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] insertNode requires a position.');
                return { doc, selection: undefined };
            }
            const parent = findParent(doc, anchor.nodeId);
            if (!parent?.children) {
                return { doc, selection: undefined };
            }

            const insertAfterIdx = parent.children.findIndex(
                (c) => c.id === anchor.nodeId,
            );
            const newChildren = [...parent.children];
            newChildren.splice(insertAfterIdx + 1, 0, step.node);

            const newDoc = replaceNodeInTree(doc, parent.id, {
                ...parent,
                children: newChildren,
            });

            // BUG-07 fix: clear selection after node insertion
            return { doc: newDoc, selection: null };
        }

        // ── Node deletion ────────────────────────────────────────────────────

        case 'deleteNode': {
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] deleteNode requires a position.');
                return { doc, selection: undefined };
            }
            return {
                doc: removeNodeFromTree(doc, anchor.nodeId),
                selection: null, // BUG-07 fix: clear selection after deletion
            };
        }

        // ── Document replacement ─────────────────────────────────────────────

        case 'replaceDoc': {
            if (!step.node) {
                console.warn('[applyTransaction] replaceDoc requires a node.');
                return { doc, selection: undefined };
            }
            if (step.node.type !== 'doc') {
                console.warn('[applyTransaction] replaceDoc: node must be type "doc".');
                return { doc, selection: undefined };
            }
            return { doc: step.node, selection: null };
        }

        // ── Document clear ───────────────────────────────────────────────────

        case 'clearDoc': {
            const emptyState = createEmptyState();
            // Point selection to the fresh empty text node
            const freshTextNode = emptyState.doc.children?.[0]?.children?.[0];
            const newSelection: Selection | null = freshTextNode
                ? {
                    anchor: { nodeId: freshTextNode.id, offset: 0 },
                    focus: { nodeId: freshTextNode.id, offset: 0 },
                    isCollapsed: true,
                }
                : null;
            return { doc: emptyState.doc, selection: newSelection };
        }

        // ── Node splitting — Enter key (BUG-25 fix) ──────────────────────────

        case 'splitNode': {
            /*
             * Splits the block containing the cursor into two sibling blocks.
             *
             * Before:  paragraph [ text("Hello World") ]  cursor at offset 5
             * After:   paragraph [ text("Hello") ]
             *          paragraph [ text(" World") ]
             *          cursor at start of second paragraph's text node
             *
             * Steps:
             *  1. Find the anchor text node and split its text at offset.
             *  2. Find the ancestor block node (direct child of doc or the
             *     closest non-text parent).
             *  3. Replace the block with [blockBefore, blockAfter].
             *  4. Return a selection pointing to the first text node in blockAfter.
             */
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] splitNode requires a position.');
                return { doc, selection: undefined };
            }

            const textNode = findNode(doc, anchor.nodeId);
            if (!textNode || textNode.type !== 'text') {
                console.warn('[applyTransaction] splitNode: anchor must be a text node.');
                return { doc, selection: undefined };
            }

            const blockNode = findParent(doc, anchor.nodeId);
            if (!blockNode) {
                console.warn('[applyTransaction] splitNode: could not find parent block.');
                return { doc, selection: undefined };
            }

            const blockParent = findParent(doc, blockNode.id);
            if (!blockParent?.children) {
                console.warn('[applyTransaction] splitNode: block has no parent.');
                return { doc, selection: undefined };
            }

            // Split the text at the cursor offset
            const text = textNode.text ?? '';
            const textBefore = text.slice(0, anchor.offset);
            const textAfter = text.slice(anchor.offset);

            // Build the "before" block — update the split text node, keep other children
            const textNodeBefore: EditorNode = { ...textNode, text: textBefore };
            const blockBefore: EditorNode = {
                ...blockNode,
                children: (blockNode.children ?? []).map((c) =>
                    c.id === textNode.id ? textNodeBefore : c,
                ),
            };

            // Build the "after" block — new IDs, text starts after cursor
            const textNodeAfter: EditorNode = {
                id: generateId(),
                type: 'text',
                text: textAfter,
                ...(textNode.marks?.length && { marks: textNode.marks }),
            };
            const blockAfter: EditorNode = {
                id: generateId(),
                type: blockNode.type,
                attrs: blockNode.attrs,
                // Preserve children that come after the split text node,
                // prepended by the new after-text node.
                children: (() => {
                    const splitIdx = (blockNode.children ?? []).findIndex(
                        (c) => c.id === textNode.id,
                    );
                    const afterSiblings = (blockNode.children ?? []).slice(splitIdx + 1);
                    return [textNodeAfter, ...afterSiblings];
                })(),
            };

            // Replace the block in its parent
            const newParentChildren = blockParent.children.flatMap((c) =>
                c.id === blockNode.id ? [blockBefore, blockAfter] : [c],
            );

            const newDoc = replaceNodeInTree(doc, blockParent.id, {
                ...blockParent,
                children: newParentChildren,
            });

            // Place cursor at the start of the new block's first text node
            const newSelection: Selection = {
                anchor: { nodeId: textNodeAfter.id, offset: 0 },
                focus: { nodeId: textNodeAfter.id, offset: 0 },
                isCollapsed: true,
            };

            return { doc: newDoc, selection: newSelection };
        }

        // ── Node merging — Backspace at block start (BUG-25 fix) ─────────────

        case 'mergeNode': {
            /*
             * Merges the anchor block's text children into the previous sibling
             * block and removes the anchor block.
             *
             * Before:  paragraph [ text("Hello") ]
             *          paragraph [ text(" World") ]  ← anchor at offset 0
             * After:   paragraph [ text("Hello"), text(" World") ]
             *          cursor at junction (offset = len of "Hello")
             *
             * Steps:
             *  1. Find the anchor block (parent of anchor text node).
             *  2. Find the previous sibling block inside the shared parent.
             *  3. Append the anchor block's children to the previous sibling.
             *  4. Remove the anchor block.
             *  5. Place cursor at the merge point in the previous sibling's
             *     last original text node.
             */
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] mergeNode requires a position.');
                return { doc, selection: undefined };
            }

            const anchorBlock = findParent(doc, anchor.nodeId);
            if (!anchorBlock) {
                console.warn('[applyTransaction] mergeNode: could not find parent block.');
                return { doc, selection: undefined };
            }

            const sharedParent = findParent(doc, anchorBlock.id);
            if (!sharedParent?.children) {
                console.warn('[applyTransaction] mergeNode: block has no parent — cannot merge.');
                return { doc, selection: undefined };
            }

            const blockIdx = sharedParent.children.findIndex(
                (c) => c.id === anchorBlock.id,
            );

            if (blockIdx === 0) {
                // Already at the very first block — nothing to merge into
                return { doc, selection: undefined };
            }

            const prevBlock = sharedParent.children[blockIdx - 1]!;

            // Determine cursor position in previous block (before merge point)
            const prevLastTextNode = (() => {
                const texts: EditorNode[] = [];
                collectTextNodes(prevBlock, texts);
                return texts[texts.length - 1] ?? null;
            })();

            const cursorNodeId = prevLastTextNode?.id ?? anchor.nodeId;
            const cursorOffset = prevLastTextNode
                ? (prevLastTextNode.text ?? '').length
                : 0;

            // Merge: append anchor block's children to previous block
            const mergedPrevBlock: EditorNode = {
                ...prevBlock,
                children: [
                    ...(prevBlock.children ?? []),
                    ...(anchorBlock.children ?? []),
                ],
            };

            // Replace prevBlock in the tree, then remove anchorBlock
            let newDoc = replaceNodeInTree(doc, prevBlock.id, mergedPrevBlock);
            newDoc = removeNodeFromTree(newDoc, anchorBlock.id);

            const newSelection: Selection = {
                anchor: { nodeId: cursorNodeId, offset: cursorOffset },
                focus: { nodeId: cursorNodeId, offset: cursorOffset },
                isCollapsed: true,
            };

            return { doc: newDoc, selection: newSelection };
        }

        // ── Exhaustiveness guard ─────────────────────────────────────────────

        default: {
            const _exhaustive: never = step.type as never;
            throw new Error(
                `[applyTransaction] Unhandled step type: "${String(_exhaustive)}"`,
            );
        }
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Applies a transaction to the editor state, returning a new immutable state.
 *
 * - Steps are applied in order
 * - Previous state is snapshotted into history.past  (BUG-03: no structuredClone)
 * - history.future is cleared (new action invalidates redo stack)
 * - storedMarks are consumed when an insertText step is present (BUG-06)
 * - selection is updated after each step (BUG-07)
 * - Original state is never mutated
 * - If no step changes the doc, the original state reference is returned
 */
export function applyTransaction(state: EditorState, tr: Transaction): EditorState {
    let newDoc = state.doc;
    let newSelection: Selection | null = state.selection;
    let clearStoredMarks = false;

    for (const step of tr.steps) {
        const result = applyStep(newDoc, step, newSelection, state.storedMarks);
        newDoc = result.doc;

        // BUG-07: update selection if the step produced one
        if (result.selection !== undefined) {
            newSelection = result.selection;
        }

        if (result.clearStoredMarks) {
            clearStoredMarks = true;
        }
    }

    // Short-circuit: nothing changed — return same reference
    if (newDoc === state.doc && newSelection === state.selection && !clearStoredMarks) {
        return state;
    }

    // BUG-03: build history snapshot with a plain spread instead of structuredClone.
    // structuredClone(state) was deep-cloning the entire past/future arrays before
    // immediately discarding them, causing O(n²) memory growth.
    const historyEntry: HistoryEntry = {
        state: {
            doc: state.doc,
            selection: state.selection,
            storedMarks: state.storedMarks,
            meta: state.meta,
            history: { past: [], future: [] }, // always strip nested history
        },
        timestamp: Date.now(),
    };

    return {
        ...state,
        doc: newDoc,
        selection: newSelection,
        // BUG-06: clear storedMarks after insertText consumed them
        storedMarks: clearStoredMarks ? undefined : state.storedMarks,
        history: {
            past: [...state.history.past, historyEntry],
            future: [],
        },
        meta: {
            ...(state.meta ?? {}),
            lastModifiedAt: Date.now(),
            lastTransactionId: tr.id,
        },
    };
}