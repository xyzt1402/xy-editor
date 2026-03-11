/**
 * Converts RawContent to EditorState.
 * @package @xy-editor/file-ingestion
 * @module converters/rawToEditorState
 *
 */

import { createEmptyState, generateId } from '@xy-editor/core';
import type { EditorState, EditorNode, Selection, Mark, MarkType } from '@xy-editor/core';
import type { RawContent, RawBlock, RawInlineMark } from '../types';

// ─── Inline Mark Conversion ───────────────────────────────────────────────────

/**
 * Splits a block's plain text into one or more text-leaf EditorNodes,
 * respecting the inline mark ranges carried by the RawBlock.
 *
 * Why splitting is necessary:
 *   The editor's mark model attaches marks to an entire text node.
 *   A RawInlineMark carries `{ start, end }` character offsets within the
 *   block text, so text like "Hello **world** today" must become THREE text
 *   nodes: ["Hello ", "world" (bold), " today"].
 *
 * When there are no marks, a single text-leaf is returned.
 *
 * Overlapping marks (e.g. bold + italic on the same range) are handled by
 * merging all marks that cover each segment.
 */
function splitTextByMarks(text: string, rawMarks?: RawInlineMark[]): EditorNode[] {
    // No marks → single leaf
    if (!rawMarks?.length) {
        return [makeTextLeaf(text, [])];
    }

    // Collect all unique boundary positions, sort them
    const boundaries = new Set<number>([0, text.length]);
    for (const m of rawMarks) {
        if (m.start >= 0 && m.start <= text.length) boundaries.add(m.start);
        if (m.end >= 0 && m.end <= text.length) boundaries.add(m.end);
    }
    const positions = Array.from(boundaries).sort((a, b) => a - b);

    const leaves: EditorNode[] = [];

    for (let i = 0; i < positions.length - 1; i++) {
        const start = positions[i]!;
        const end = positions[i + 1]!;
        const segmentText = text.slice(start, end);

        if (!segmentText) continue; // skip zero-length segments

        // Collect all marks whose range fully covers this segment
        const marks: Mark[] = rawMarks
            .filter((m) => m.start <= start && m.end >= end)
            .map((m) => ({
                type: m.type as MarkType,
                ...(m.attrs !== undefined && { attrs: m.attrs }),
            }));

        leaves.push(makeTextLeaf(segmentText, marks));
    }

    // Edge-case: if all segments were zero-length, fall back to a single leaf
    return leaves.length > 0 ? leaves : [makeTextLeaf(text, [])];
}

/** Creates a single `type:'text'` leaf node. */
function makeTextLeaf(text: string, marks: Mark[]): EditorNode {
    return {
        id: generateId(),
        type: 'text',
        text,
        // Omit `marks` entirely when empty — keeps the tree clean
        ...(marks.length > 0 && { marks }),
    };
}

// ─── Block → Node Conversion ──────────────────────────────────────────────────

/**
 * Converts a RawBlock to an EditorNode.
 *
 * Container nodes (paragraph, heading, listItem, …) get `children` containing
 * one or more `type:'text'` leaf nodes produced by `splitTextByMarks`.
 *
 * This satisfies the EditorNode contract:
 *   - Container nodes  →  have `children`, no `text`
 *   - Leaf text nodes  →  have `text`,     no `children`
 */
function blockToNode(block: RawBlock): EditorNode {
    // Build text-leaf children for every content-bearing block type
    const textChildren = splitTextByMarks(block.text ?? '', block.marks);

    switch (block.type) {
        case 'heading':
            return {
                id: generateId(),
                type: 'heading',
                attrs: {
                    ...(block.data ?? {}),
                    level: block.level ?? 1,
                },
                children: textChildren,
            };

        case 'paragraph':
            return {
                id: generateId(),
                type: 'paragraph',
                attrs: block.data ?? {},
                children: textChildren,
            };

        case 'list-item':
            return {
                id: generateId(),
                type: 'listItem',
                attrs: block.data ?? {},
                children: textChildren,
            };

        case 'blockquote':
            return {
                id: generateId(),
                type: 'blockquote',
                attrs: block.data ?? {},
                children: textChildren,
            };

        case 'code':
            return {
                id: generateId(),
                type: 'codeBlock',
                attrs: block.data ?? {},
                // Code blocks keep their text in a single unformatted leaf
                children: [makeTextLeaf(block.text ?? '', [])],
            };

        case 'table-row':
            return {
                id: generateId(),
                type: 'tableRow',
                attrs: block.data ?? {},
                // Each cell could be its own leaf; for now we store the joined
                // text in a single leaf and preserve cell data in attrs.
                children: [makeTextLeaf(block.text ?? '', [])],
            };

        case 'hr':
            // Horizontal rule is a void node — no text children
            return {
                id: generateId(),
                type: 'horizontalRule',
                attrs: block.data ?? {},
            };

        default: {
            // Unknown block type — treat as paragraph with plain text
            return {
                id: generateId(),
                type: 'paragraph',
                attrs: block.data ?? {},
                children: textChildren,
            };
        }
    }
}

// ─── Default Selection ────────────────────────────────────────────────────────

/**
 * Finds the first `type:'text'` leaf node anywhere in the document tree.
 * Now works correctly because blockToNode produces proper text-leaf children
 * (BUG-01 fix).
 */
function findFirstTextNode(node: EditorNode): EditorNode | undefined {
    if (node.type === 'text') return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findFirstTextNode(child);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Creates a default collapsed selection pointing to the start of the first
 * text node in the document, ensuring the editor opens with a valid cursor.
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

// ─── Public API ───────────────────────────────────────────────────────────────

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
    const baseState = createEmptyState();

    const children: EditorNode[] = raw.blocks.map(blockToNode);

    const docNode: EditorNode = {
        id: generateId(),
        type: 'doc',
        children,
        attrs: {
            sourceFilename: raw.meta.filename,
            sourceMimeType: raw.meta.mimeType,
        },
    };

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