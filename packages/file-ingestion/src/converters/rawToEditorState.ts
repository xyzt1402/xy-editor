/**
 * Converts RawContent to EditorState.
 * @package @xy-editor/file-ingestion
 * @module converters/rawToEditorState
 */

import { createEmptyState, generateId } from '@xy-editor/core';
import type { EditorState, EditorNode, Selection } from '@xy-editor/core';
import type { RawContent, RawBlock } from '../types';

/**
 * Converts a RawBlock to an EditorNode.
 */
function blockToNode(block: RawBlock): EditorNode {
    const node: EditorNode = {
        id: generateId(),
        type: block.type,
        attrs: block.data || {},
    };

    switch (block.type) {
        case 'heading':
            node.type = 'heading';
            node.attrs = { ...node.attrs, level: block.level };
            node.text = block.text;
            break;

        case 'paragraph':
            node.type = 'paragraph';
            node.text = block.text;
            break;

        case 'list-item':
            node.type = 'listItem';
            node.text = block.text;
            break;

        case 'table-row':
            node.type = 'tableRow';
            node.text = block.text;
            break;

        case 'code':
            node.type = 'codeBlock';
            node.text = block.text;
            break;

        case 'hr':
            node.type = 'horizontalRule';
            node.text = '';
            break;

        default:
            node.text = block.text || '';
    }

    return node;
}

/**
 * Finds the first text node in the document tree.
 */
function findFirstTextNode(node: EditorNode): EditorNode | undefined {
    if (node.type === 'text') {
        return node;
    }
    if (node.children) {
        for (const child of node.children) {
            const found = findFirstTextNode(child);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Creates a default selection pointing to the first text node in the document.
 * This ensures the editor has a valid selection after file ingestion.
 */
function createDefaultSelection(doc: EditorNode): Selection | null {
    const firstTextNode = findFirstTextNode(doc);
    if (!firstTextNode) return null;

    return {
        anchor: { nodeId: firstTextNode.id, offset: 0 },
        focus: { nodeId: firstTextNode.id, offset: 0 },
        isCollapsed: true,
    };
}

/**
 * Converts RawContent to EditorState.
 * 
 * Uses createEmptyState as a base and replaces the document content
 * with the converted blocks.
 * 
 * @param raw - The raw content to convert
 * @returns EditorState ready for the editor
 * 
 * @example
 * ```typescript
 * const rawContent = await parser.parse(file);
 * const state = convertToEditorState(rawContent);
 * ```
 */
export function convertToEditorState(raw: RawContent): EditorState {
    // Start with an empty state
    const baseState = createEmptyState();

    // Convert raw blocks to editor nodes
    const children: EditorNode[] = raw.blocks.map(blockToNode);

    // Create the new document node
    const docNode: EditorNode = {
        id: generateId(),
        type: 'doc',
        children,
        attrs: {
            sourceFilename: raw.meta.filename,
            sourceMimeType: raw.meta.mimeType,
        },
    };

    // Return the new state with a default selection
    return {
        ...baseState,
        doc: docNode,
        selection: createDefaultSelection(docNode),
        meta: {
            ...baseState.meta,
            ...raw.meta,
            ingestedAt: Date.now(),
        },
    };
}
