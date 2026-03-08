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
} from './types';

// ─── Tree Helpers ─────────────────────────────────────────────────────────────

/**
 * Collects all leaf text nodes from the document tree in document order.
 */
function collectTextNodes(node: EditorNode, result: EditorNode[]): void {
    if (node.type === 'text') {
        result.push(node);
        return; // text nodes never have children
    }
    if (node.children) {
        for (const child of node.children) {
            collectTextNodes(child, result);
        }
    }
}

/**
 * Finds a node by ID anywhere in the tree.
 * Returns undefined if not found.
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
 * Returns a new tree with the node matching `nodeId` replaced by `replacement`.
 * Uses structural sharing — unaffected branches return the same reference.
 * Does not mutate the input tree.
 */
function replaceNodeInTree(
    node: EditorNode,
    nodeId: string,
    replacement: EditorNode,
): EditorNode {
    if (node.id === nodeId) return replacement;
    if (!node.children?.length) return node;

    const newChildren = node.children.map((child) =>
        replaceNodeInTree(child, nodeId, replacement)
    );

    // Avoid allocating a new object if no child reference changed
    const changed = newChildren.some((c, i) => c !== node.children![i]);
    if (!changed) return node;

    return { ...node, children: newChildren };
}

// ─── Mark Transforms ──────────────────────────────────────────────────────────

function addMarkToNode(node: EditorNode, step: TransformStep): EditorNode {
    if (!step.mark) return node;

    const marks = node.marks ?? [];
    const alreadyPresent = marks.some((m) => m.type === step.mark!.type);
    if (alreadyPresent) return node; // same ref — no change

    return { ...node, marks: [...marks, step.mark] };
}

function removeMarkFromNode(node: EditorNode, step: TransformStep): EditorNode {
    if (!step.mark) return node;

    const marks = node.marks ?? [];
    const filtered = marks.filter((m) => m.type !== step.mark!.type);
    if (filtered.length === marks.length) return node; // same ref — no change

    return { ...node, marks: filtered };
}

// ─── Selection-Range Application ──────────────────────────────────────────────

/**
 * Applies a transform function to every text node within the given selection.
 * Nodes outside the selection are unchanged (structural sharing).
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
        if (updated === original) continue; // skip tree walk if nothing changed
        newDoc = replaceNodeInTree(newDoc, original.id, updated);
    }

    return newDoc;
}

/**
 * Resolves a step's position into a Selection.
 * Returns null if anchor or focus is missing.
 */
function resolveStepSelection(step: TransformStep): Selection | null {
    const anchor = step.position?.anchor;
    const focus = step.position?.focus;
    if (!anchor || !focus) return null;
    return { anchor, focus };
}

// ─── Step Dispatch ────────────────────────────────────────────────────────────

function applyStep(
    doc: EditorNode,
    step: TransformStep,
    stateSelection: Selection | null,
): EditorNode {
    // Mark operations use the step's own position if provided,
    // otherwise fall back to the current editor selection
    const selectionForStep = resolveStepSelection(step) ?? stateSelection;

    switch (step.type) {
        case 'addMark': {
            if (!selectionForStep) {
                console.warn('[applyTransaction] addMark requires an active selection.');
                return doc;
            }
            return applyToSelection(
                doc,
                selectionForStep,
                (node) => addMarkToNode(node, step),
            );
        }

        case 'removeMark': {
            if (!selectionForStep) {
                console.warn('[applyTransaction] removeMark requires an active selection.');
                return doc;
            }
            return applyToSelection(
                doc,
                selectionForStep,
                (node) => removeMarkFromNode(node, step),
            );
        }

        case 'setNode': {
            const anchor = step.position?.anchor;
            if (!anchor) {
                console.warn('[applyTransaction] setNode requires position.anchor.');
                return doc;
            }
            const target = findNode(doc, anchor.nodeId);
            if (!target) return doc;
            return replaceNodeInTree(doc, anchor.nodeId, {
                ...target,
                attrs: { ...target.attrs, ...step.data },
            });
        }

        case 'insertNode':
        case 'deleteNode':
            // Planned — requires parent-level tree operations
            throw new Error(
                `[applyTransaction] Step type '${step.type}' is not yet implemented.`
            );

        default: {
            // Exhaustiveness guard — TypeScript errors here if TransformStepType
            // gains a new member that is not handled above
            const _exhaustive: never = step.type as never;
            throw new Error(
                `[applyTransaction] Unknown step type: ${String(_exhaustive)}`
            );
        }
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Applies a transaction to the editor state, returning a new immutable state.
 *
 * Behaviour:
 * - All steps are applied in order to produce the new document
 * - The previous state is pushed to history.past (for undo)
 * - history.future is cleared (new action invalidates the redo stack)
 * - The original state is never mutated
 * - If no step changes the document, the original state reference is returned
 *   (prevents unnecessary re-renders in React)
 *
 * @param state - Current editor state
 * @param tr    - Transaction containing one or more transform steps
 * @returns     New editor state, or the same reference if nothing changed
 */
export function applyTransaction(state: EditorState, tr: Transaction): EditorState {
    let newDoc = state.doc;

    for (const step of tr.steps) {
        newDoc = applyStep(newDoc, step, state.selection);
    }

    // Short-circuit: if no step produced a new doc reference, nothing changed
    if (newDoc === state.doc) {
        return state;
    }

    // HistoryEntry stores the full previous state per the HistoryEntry interface.
    // Note: structuredClone here is intentional — we need an independent snapshot
    // so future mutations to the active state don't corrupt the history entry.
    const historyEntry: HistoryEntry = {
        state: structuredClone(state),
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