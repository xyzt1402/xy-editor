/**
 * Applies a transaction to the editor state.
 * @package @xy-editor/core
 * @module state/applyTransaction
 */

import type { EditorState, Transaction, TransformStep, EditorNode } from './types';

/**
 * Deep clones an object using structuredClone (with fallback).
 * Ensures immutability of the state.
 */
function deepClone<T>(obj: T): T {
    return structuredClone(obj);
}

/**
 * Applies a single transform step to a node.
 * Returns a new node with the transformation applied.
 */
function applyStepToNode(node: EditorNode, step: TransformStep): EditorNode {
    const newNode = deepClone(node);

    switch (step.type) {
        case 'addMark':
            if (step.mark) {
                newNode.marks = newNode.marks || [];
                // Check if mark already exists with same type
                const exists = newNode.marks.some(
                    (m) => m.type === step.mark!.type
                );
                if (!exists) {
                    newNode.marks.push(deepClone(step.mark));
                }
            }
            break;

        case 'removeMark':
            if (step.mark) {
                newNode.marks = (newNode.marks || []).filter(
                    (m) => m.type !== step.mark!.type
                );
            }
            break;

        case 'setNode':
            if (step.data) {
                newNode.attrs = { ...newNode.attrs, ...step.data };
            }
            break;

        case 'insertNode':
            // This would typically be handled at the parent level
            break;

        case 'deleteNode':
            // This would typically be handled at the parent level
            break;

        default:
            // Unknown step type, return node as-is
            break;
    }

    return newNode;
}

/**
 * Applies marks to all nodes within a selection range.
 */
function applyMarksToSelection(
    doc: EditorNode,
    selection: { anchor: { nodeId: string; offset: number }; focus: { nodeId: string; offset: number } },
    markAction: (node: EditorNode) => EditorNode
): EditorNode {
    // Clone the entire document
    const newDoc = deepClone(doc);

    // Collect all text nodes between anchor and focus
    const allNodes: EditorNode[] = [];
    collectTextNodes(newDoc, allNodes);

    // Find anchor and focus positions
    const anchorIndex = allNodes.findIndex(n => n.id === selection.anchor.nodeId);
    const focusIndex = allNodes.findIndex(n => n.id === selection.focus.nodeId);

    if (anchorIndex === -1 || focusIndex === -1) {
        return newDoc;
    }

    // Determine range to apply marks
    const startIndex = Math.min(anchorIndex, focusIndex);
    const endIndex = Math.max(anchorIndex, focusIndex);

    // Apply mark action to each node in range
    for (let i = startIndex; i <= endIndex; i++) {
        const node = allNodes[i];
        if (!node) continue;
        const updatedNode = markAction(node);
        // Update the node in the document tree
        updateNodeInTree(newDoc, node.id, updatedNode);
    }

    return newDoc;
}

/**
 * Collects all text nodes from a document tree.
 */
function collectTextNodes(node: EditorNode, result: EditorNode[]): void {
    if (node.type === 'text' || node.text !== undefined) {
        result.push(node);
    }
    if (node.children) {
        for (const child of node.children) {
            collectTextNodes(child, result);
        }
    }
}

/**
 * Updates a node in the document tree by replacing it with a new one.
 */
function updateNodeInTree(doc: EditorNode, nodeId: string, newNode: EditorNode): EditorNode {
    if (doc.id === nodeId) {
        return newNode;
    }

    if (doc.children) {
        const newChildren = doc.children.map(child => {
            if (child.id === nodeId) {
                return newNode;
            }
            return updateNodeInTree(child, nodeId, newNode);
        });

        return {
            ...doc,
            children: newChildren,
        };
    }

    return doc;
}

/**
 * Applies a single transform step to the document.
 */
function applyStep(doc: EditorNode, step: TransformStep): EditorNode {
    if (!step.position) {
        return doc;
    }

    const { anchor, focus } = step.position;

    if (!anchor || !focus) {
        return doc;
    }

    const selection = { anchor, focus };

    switch (step.type) {
        case 'addMark':
            return applyMarksToSelection(doc, selection, (node) =>
                applyStepToNode(node, step)
            );

        case 'removeMark':
            return applyMarksToSelection(doc, selection, (node) =>
                applyStepToNode(node, step)
            );

        default:
            return doc;
    }
}

/**
 * Applies a transaction to the editor state.
 * 
 * This function:
 * 1. Applies all transforms in the transaction in order
 * 2. Pushes an inverse transaction to history.past
 * 3. Clears history.future
 * 4. Returns a new immutable state
 * 
 * @param state - The current editor state
 * @param tr - The transaction to apply
 * @returns A new editor state with the transaction applied
 * 
 * @example
 * ```typescript
 * const newState = applyTransaction(state, transaction);
 * // state is not mutated
 * // newState has the transaction applied
 * ```
 */
export function applyTransaction(state: EditorState, tr: Transaction): EditorState {
    // Clone the current state to ensure immutability
    const currentState = deepClone(state);

    // Store the previous state for history (before applying the transaction)
    const previousState = deepClone(state);

    // Apply all steps in the transaction
    let newDoc = currentState.doc;

    for (const step of tr.steps) {
        newDoc = applyStep(newDoc, step);
    }

    // Build the new state
    const newState: EditorState = {
        ...currentState,
        doc: newDoc,
        // Update history: push current state to past, clear future
        history: {
            past: [
                ...currentState.history.past,
                {
                    state: previousState,
                    timestamp: Date.now(),
                },
            ],
            future: [], // Clear redo stack
        },
        meta: {
            ...currentState.meta,
            lastTransaction: tr.id,
            lastAppliedAt: Date.now(),
        },
    };

    return newState;
}
