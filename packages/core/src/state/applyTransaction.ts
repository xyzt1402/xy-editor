/**
 * Applies a transaction to the editor state.
 * @package @xy-editor/core
 * @module state/applyTransaction
 */

import type {
    EditorState,
    Transaction,
    TransformStep,
    EditorNode,
    Selection,
    HistoryEntry,
    Mark,
} from './types';
import { createEmptyState } from './createEmptyState';

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
function findParent(
    root: EditorNode,
    targetId: string,
): EditorNode | undefined {
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

/**
 * Resolves a Selection from a step's position.
 * Returns null if anchor or focus is missing.
 */
function resolveStepSelection(step: TransformStep): Selection | null {
    const anchor = step.position?.anchor;
    const focus = step.position?.focus;
    if (!anchor || !focus) return null;
    return { anchor, focus };
}

/**
 * Applies a transform function to all text nodes within a selection range.
 */
function applyToSelection(
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

    let newDoc = doc;
    for (let i = start; i <= end; i++) {
        const original = textNodes[i]!;
        const updated = transform(original);
        if (updated === original) continue;
        newDoc = replaceNodeInTree(newDoc, original.id, updated);
    }

    return newDoc;
}

// ─── Mark Operations ──────────────────────────────────────────────────────────

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

// ─── Step Handlers ────────────────────────────────────────────────────────────

function applyStep(
    doc: EditorNode,
    step: TransformStep,
    stateSelection: Selection | null,
): EditorNode {
    const selectionForStep = resolveStepSelection(step) ?? stateSelection;

    switch (step.type) {

        // ── Mark steps ──────────────────────────────────────────────────────

        case 'addMark': {
            if (!step.mark) {
                console.warn('[applyTransaction] addMark step is missing mark.');
                return doc;
            }
            if (!selectionForStep) {
                console.warn('[applyTransaction] addMark requires an active selection.');
                return doc;
            }
            return applyToSelection(doc, selectionForStep, (node) =>
                addMarkToNode(node, step.mark!),
            );
        }

        case 'removeMark': {
            if (!step.mark) {
                console.warn('[applyTransaction] removeMark step is missing mark.');
                return doc;
            }
            if (!selectionForStep) {
                console.warn('[applyTransaction] removeMark requires an active selection.');
                return doc;
            }
            return applyToSelection(doc, selectionForStep, (node) =>
                removeMarkFromNode(node, step.mark!.type),
            );
        }

        // ── Node attribute step ──────────────────────────────────────────────

        case 'setNode': {
            const anchor = step.position?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] setNode requires position.anchor.');
                return doc;
            }
            const target = findNode(doc, anchor.nodeId);
            if (!target) {
                console.warn(`[applyTransaction] setNode: node '${anchor.nodeId}' not found.`);
                return doc;
            }
            return replaceNodeInTree(doc, anchor.nodeId, {
                ...target,
                attrs: { ...target.attrs, ...step.data },
            });
        }

        // ── Text insertion ───────────────────────────────────────────────────

        case 'insertText': {
            const text = step.data?.text;
            if (typeof text !== 'string') {
                console.warn('[applyTransaction] insertText requires data.text string.');
                return doc;
            }
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] insertText requires a selection or position.');
                return doc;
            }
            const targetNode = findNode(doc, anchor.nodeId);
            if (!targetNode || targetNode.type !== 'text') {
                console.warn('[applyTransaction] insertText: target must be a text node.');
                return doc;
            }
            const before = (targetNode.text ?? '').slice(0, anchor.offset);
            const after = (targetNode.text ?? '').slice(anchor.offset);
            return replaceNodeInTree(doc, anchor.nodeId, {
                ...targetNode,
                text: before + text + after,
            });
        }

        // ── Text deletion ────────────────────────────────────────────────────

        case 'deleteText': {
            const anchor = step.position?.anchor;
            const focus = step.position?.focus;
            if (!anchor || !focus) {
                console.warn('[applyTransaction] deleteText requires both anchor and focus.');
                return doc;
            }
            // Same-node deletion only for now — cross-node deletion handled by mergeNode
            if (anchor.nodeId !== focus.nodeId) {
                console.warn('[applyTransaction] deleteText: cross-node deletion — use mergeNode.');
                return doc;
            }
            const targetNode = findNode(doc, anchor.nodeId);
            if (!targetNode || targetNode.type !== 'text') return doc;

            const start = Math.min(anchor.offset, focus.offset);
            const end = Math.max(anchor.offset, focus.offset);
            const text = targetNode.text ?? '';
            return replaceNodeInTree(doc, anchor.nodeId, {
                ...targetNode,
                text: text.slice(0, start) + text.slice(end),
            });
        }

        // ── Node insertion ───────────────────────────────────────────────────

        case 'insertNode': {
            if (!step.node) {
                console.warn('[applyTransaction] insertNode requires a node.');
                return doc;
            }
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] insertNode requires a position.');
                return doc;
            }
            const parent = findParent(doc, anchor.nodeId);
            if (!parent?.children) return doc;

            const insertAfterIdx = parent.children.findIndex(
                (c) => c.id === anchor.nodeId,
            );
            const newChildren = [...parent.children];
            newChildren.splice(insertAfterIdx + 1, 0, step.node);

            return replaceNodeInTree(doc, parent.id, {
                ...parent,
                children: newChildren,
            });
        }

        // ── Node deletion ────────────────────────────────────────────────────

        case 'deleteNode': {
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] deleteNode requires a position.');
                return doc;
            }
            return removeNodeFromTree(doc, anchor.nodeId);
        }

        // ── Document replacement ─────────────────────────────────────────────

        case 'replaceDoc': {
            // Replaces the entire document node.
            // Used by file ingestion to load a new document.
            if (!step.node) {
                console.warn('[applyTransaction] replaceDoc requires a node.');
                return doc;
            }
            if (step.node.type !== 'doc') {
                console.warn('[applyTransaction] replaceDoc: node must be type "doc".');
                return doc;
            }
            return step.node;
        }

        // ── Document clear ───────────────────────────────────────────────────

        case 'clearDoc': {
            // Resets to a single empty paragraph — same as createEmptyState's doc
            return createEmptyState().doc;
        }

        // ── Node splitting (Enter key) ───────────────────────────────────────

        case 'splitNode': {
            // Splits the block at the anchor position into two sibling blocks.
            // E.g. pressing Enter in the middle of a paragraph creates two paragraphs.
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] splitNode requires a position.');
                return doc;
            }
            // TODO: implement full split logic — requires generating new node IDs
            // and handling cursor placement after split
            throw new Error('[applyTransaction] splitNode is not yet implemented.');
        }

        // ── Node merging (Backspace at start of block) ───────────────────────

        case 'mergeNode': {
            // Merges the target node's content into the previous sibling.
            // E.g. pressing Backspace at the start of a paragraph.
            const anchor = step.position?.anchor ?? stateSelection?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] mergeNode requires a position.');
                return doc;
            }
            // TODO: implement merge logic — move children of target into prev sibling
            throw new Error('[applyTransaction] mergeNode is not yet implemented.');
        }

        // ── Exhaustiveness guard ─────────────────────────────────────────────

        default: {
            // TypeScript will produce a compile error here if a new
            // TransformStepType is added without a corresponding case above.
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
 * - Previous state is snapshotted into history.past
 * - history.future is cleared (new action invalidates redo stack)
 * - Original state is never mutated
 * - If no step changes the doc, the original state reference is returned
 *   (prevents unnecessary re-renders)
 * @param state - Current editor state
 * @param tr    - Transaction containing one or more transform steps
 * @returns   New editor state, or the same reference if nothing changed
 */
export function applyTransaction(state: EditorState, tr: Transaction): EditorState {
    let newDoc = state.doc;

    for (const step of tr.steps) {
        newDoc = applyStep(newDoc, step, state.selection);
    }

    // Short-circuit: nothing changed — return same reference
    if (newDoc === state.doc) return state;

    const historyEntry: HistoryEntry = {
        state: {
            ...structuredClone(state),           // deep clone doc, selection, meta, storedMarks
            history: { past: [], future: [] },   // override with empty stacks
        },
        timestamp: Date.now(),
    };

    return {
        ...state,
        doc: newDoc,
        history: {
            past: [...state.history.past, historyEntry],
            future: [], // invalidate redo stack
        },
        meta: {
            ...(state.meta ?? {}),
            lastModifiedAt: Date.now(),
            lastTransactionId: tr.id,
        },
    };
}