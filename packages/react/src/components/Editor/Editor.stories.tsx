/**
 * Editor component stories.
 * @package @xy-editor/react
 * @module components/Editor/Editor.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Editor } from './Editor';
import { createEmptyState, generateId } from '@xy-editor/core';
import type { EditorState, EditorNode, Mark } from '@xy-editor/core';
import React, { useState, useRef } from 'react';

/**
 * Helper to create editor state with blocks.
 */
function makeEditorState(blocks: EditorNode[]): EditorState {
    return {
        doc: {
            id: generateId(),
            type: 'doc',
            children: blocks,
        },
        selection: null,
        history: { past: [], future: [] },
    };
}

/**
 * Helper to create a text node.
 */
function textNode(text: string, marks: Mark[] = []): EditorNode {
    return {
        id: generateId(),
        type: 'text',
        text,
        marks,
    };
}

/**
 * Helper to create a paragraph with text.
 */
function paragraph(text: string, marks: Mark[] = []): EditorNode {
    return {
        id: generateId(),
        type: 'paragraph',
        children: [textNode(text, marks)],
    };
}

/**
 * Helper to create a heading.
 */
function heading(text: string, level: number = 2): EditorNode {
    return {
        id: generateId(),
        type: 'heading',
        attrs: { level },
        children: [textNode(text)],
    };
}

/**
 * Helper to create a table.
 */
function table(rows: number, cols: number): EditorNode {
    const cells: EditorNode[] = [];
    for (let r = 0; r < rows; r++) {
        const row: EditorNode = {
            id: generateId(),
            type: 'tableRow',
            children: [],
        };
        for (let c = 0; c < cols; c++) {
            row.children!.push({
                id: generateId(),
                type: 'tableCell',
                children: [textNode(`Cell ${r + 1}-${c + 1}`)],
            });
        }
        cells.push(row);
    }
    return {
        id: generateId(),
        type: 'table',
        attrs: { columns: cols },
        children: cells,
    };
}

const meta: Meta<typeof Editor> = {
    title: 'Editor/Editor',
    component: Editor,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
        readOnly: { control: 'boolean' },
        placeholder: { control: 'text' },
        toolbar: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default story - empty editor
export const Default: Story = {
    args: {
        placeholder: 'Start typing...',
        toolbar: true,
    },
};

// With pre-loaded content
export const WithContent: Story = {
    args: {
        placeholder: 'Start typing...',
    },
    render: (args) => {
        const state = makeEditorState([
            heading('Welcome to xy-editor', 1),
            paragraph('This is a paragraph with some content.'),
            paragraph('And another paragraph with more text.'),
        ]);
        return <Editor {...args} defaultValue={state} />;
    },
};

// Read-only mode
export const ReadOnly: Story = {
    args: {
        readOnly: true,
    },
    render: (args) => {
        const state = makeEditorState([
            heading('Read-Only Document', 1),
            paragraph('This document is read-only. Try typing - it will not work.'),
        ]);
        return <Editor {...args} defaultValue={state} />;
    },
};

// All mark types
export const AllMarkTypes: Story = {
    args: {},
    render: () => {
        const state = makeEditorState([
            paragraph('Normal text'),
            paragraph('Bold text', [{ type: 'bold' }]),
            paragraph('Italic text', [{ type: 'italic' }]),
            paragraph('Underline text', [{ type: 'underline' }]),
            paragraph('Strikethrough text', [{ type: 'strikethrough' }]),
            paragraph('Bold + Italic', [{ type: 'bold' }, { type: 'italic' }]),
            paragraph('Underline + Strikethrough', [{ type: 'underline' }, { type: 'strikethrough' }]),
            paragraph('Colored text', [{ type: 'color', attrs: { color: '#ff0000' } }]),
            paragraph('Highlighted text', [{ type: 'highlight', attrs: { color: '#ffff00' } }]),
            paragraph('Monospace code', [{ type: 'code' }]),
            paragraph('Custom font size', [{ type: 'fontSize', attrs: { value: 24 } }]),
            paragraph('Custom font family', [{ type: 'fontFamily', attrs: { value: 'Georgia' } }]),
        ]);
        return <Editor defaultValue={state} />;
    },
};

// Controlled with external state
export const ControlledWithExternalState: Story = {
    args: {},
    render: () => {
        const [state, setState] = useState<EditorState>(makeEditorState([
            paragraph('Initial content'),
        ]));

        const appendParagraph = () => {
            const newPara: EditorNode = {
                id: generateId(),
                type: 'paragraph',
                children: [textNode('New paragraph added from outside!')],
            };
            setState({
                ...state,
                doc: {
                    ...state.doc,
                    children: [...(state.doc.children ?? []), newPara],
                },
            });
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button onClick={appendParagraph} style={{ padding: '8px 16px' }}>
                    Add Paragraph
                </button>
                <Editor value={state} onChange={setState} />
            </div>
        );
    },
};

// Paste simulation
export const PasteSimulation: Story = {
    args: {},
    render: () => {
        const state = makeEditorState([
            paragraph('Existing content before paste'),
        ]);

        return <Editor defaultValue={state} />;
    },
};

// Table example
export const TableExample: Story = {
    args: {},
    render: () => {
        const state = makeEditorState([
            heading('Table Example', 2),
            table(3, 3),
        ]);
        return <Editor defaultValue={state} />;
    },
};

// Drop zone
export const DropZone: Story = {
    args: {
        dropZone: true,
    },
    render: (args) => {
        const state = makeEditorState([
            paragraph('Drag and drop a file here'),
        ]);
        return <Editor {...args} defaultValue={state} />;
    },
};

// Long document
export const LongDocument: Story = {
    args: {},
    render: () => {
        const paragraphs: EditorNode[] = [];
        for (let i = 0; i < 50; i++) {
            paragraphs.push(paragraph(`Paragraph ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`));
        }
        const state = makeEditorState(paragraphs);
        return <Editor defaultValue={state} style={{ height: '400px', overflow: 'auto' }} />;
    },
};

// Auto focus
export const AutoFocus: Story = {
    args: {
        autoFocus: true,
    },
    render: (args) => {
        return <Editor {...args} placeholder="Editor should auto-focus on mount" />;
    },
};
