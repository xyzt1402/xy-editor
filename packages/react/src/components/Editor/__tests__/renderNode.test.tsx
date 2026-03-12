/**
 * Tests for renderNode function.
 * @package @xy-editor/react
 * @module components/Editor/__tests__/renderNode.test
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderNode } from '../renderNode';
import type { EditorNode } from '@xy-editor/core';

describe('renderNode', () => {
    // Structure tests
    it('paragraph carries data-node-id', () => {
        const node: EditorNode = {
            id: 'test-paragraph',
            type: 'paragraph',
            children: [{ id: 'text-1', type: 'text', text: 'Hello' }],
        };
        const { container } = render(renderNode(node, 'key'));
        const p = container.querySelector('p');
        expect(p).toHaveAttribute('data-node-id', 'test-paragraph');
    });

    it('heading renders h1 for level 1', () => {
        const node: EditorNode = {
            id: 'heading-1',
            type: 'heading',
            attrs: { level: 1 },
            children: [{ id: 'text-1', type: 'text', text: 'Title' }],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('h1')).toHaveAttribute('data-node-id', 'heading-1');
    });

    it('heading renders h3 for level 3', () => {
        const node: EditorNode = {
            id: 'heading-3',
            type: 'heading',
            attrs: { level: 3 },
            children: [{ id: 'text-1', type: 'text', text: 'Title' }],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('h3')).toHaveAttribute('data-node-id', 'heading-3');
    });

    it('heading defaults to h2 when level missing', () => {
        const node: EditorNode = {
            id: 'heading-default',
            type: 'heading',
            children: [{ id: 'text-1', type: 'text', text: 'Title' }],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('h2')).toHaveAttribute('data-node-id', 'heading-default');
    });

    it('unknown node type renders as div with console.warn', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const node: EditorNode = {
            id: 'unknown-node',
            type: 'unknown-type' as EditorNode['type'],
            children: [],
        };
        const { container } = render(renderNode(node, 'key'));
        const div = container.querySelector('div');
        expect(div).toHaveAttribute('data-node-id', 'unknown-node');
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('all rendered elements carry data-node-id', () => {
        const node: EditorNode = {
            id: 'doc-1',
            type: 'doc',
            children: [
                {
                    id: 'para-1',
                    type: 'paragraph',
                    children: [{ id: 'text-1', type: 'text', text: 'Hello' }],
                },
            ],
        };
        const { container } = render(renderNode(node, 'key'));
        const elementsWithId = container.querySelectorAll('[data-node-id]');
        expect(elementsWithId.length).toBeGreaterThan(0);
        elementsWithId.forEach((el) => {
            expect(el.getAttribute('data-node-id')).toBeTruthy();
        });
    });

    it('children are rendered recursively', () => {
        const node: EditorNode = {
            id: 'doc-1',
            type: 'doc',
            children: [
                {
                    id: 'para-1',
                    type: 'paragraph',
                    children: [{ id: 'text-1', type: 'text', text: 'Hello' }],
                },
                {
                    id: 'para-2',
                    type: 'paragraph',
                    children: [{ id: 'text-2', type: 'text', text: 'World' }],
                },
            ],
        };
        const { container } = render(renderNode(node, 'key'));
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs.length).toBe(2);
    });

    // Text and marks tests
    it('text node applies bold style', () => {
        const node: EditorNode = {
            id: 'text-bold',
            type: 'text',
            text: 'Bold text',
            marks: [{ type: 'bold' }],
        };
        const { container } = render(renderNode(node, 'key'));
        const span = container.querySelector('span');
        expect(span).toHaveStyle({ fontWeight: '700' });
    });

    it('text node applies italic style', () => {
        const node: EditorNode = {
            id: 'text-italic',
            type: 'text',
            text: 'Italic text',
            marks: [{ type: 'italic' }],
        };
        const { container } = render(renderNode(node, 'key'));
        const span = container.querySelector('span');
        expect(span).toHaveStyle({ fontStyle: 'italic' });
    });

    it('text node applies color from marks', () => {
        const node: EditorNode = {
            id: 'text-color',
            type: 'text',
            text: 'Colored text',
            marks: [{ type: 'color', attrs: { color: '#ff0000' } }],
        };
        const { container } = render(renderNode(node, 'key'));
        const span = container.querySelector('span');
        expect(span).toHaveStyle({ color: '#ff0000' });
    });

    it('text node applies strikethrough as line-through', () => {
        const node: EditorNode = {
            id: 'text-strike',
            type: 'text',
            text: 'Strikethrough text',
            marks: [{ type: 'strikethrough' }],
        };
        const { container } = render(renderNode(node, 'key'));
        const span = container.querySelector('span');
        expect(span).toHaveStyle({ textDecoration: 'line-through' });
    });

    it('empty text node renders <br> inside span', () => {
        const node: EditorNode = {
            id: 'text-empty',
            type: 'text',
            text: '',
        };
        const { container } = render(renderNode(node, 'key'));
        const span = container.querySelector('span');
        expect(span).toHaveAttribute('data-node-id', 'text-empty');
        expect(span?.innerHTML).toBe('<br>');
    });

    // List tests
    it('list with ordered=false renders <ul>', () => {
        const node: EditorNode = {
            id: 'list-1',
            type: 'bulletList',
            attrs: { ordered: false },
            children: [
                { id: 'li-1', type: 'listItem', children: [{ id: 'text-1', type: 'text', text: 'Item 1' }] },
            ],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('ul')).toBeTruthy();
    });

    it('list with ordered=true renders <ol>', () => {
        const node: EditorNode = {
            id: 'list-1',
            type: 'orderedList',
            attrs: { ordered: true },
            children: [
                { id: 'li-1', type: 'listItem', children: [{ id: 'text-1', type: 'text', text: 'Item 1' }] },
            ],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('ol')).toBeTruthy();
    });

    it('list-item renders <li>', () => {
        const node: EditorNode = {
            id: 'li-1',
            type: 'listItem',
            children: [{ id: 'text-1', type: 'text', text: 'Item' }],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('li')).toHaveAttribute('data-node-id', 'li-1');
    });

    // Block tests
    it('code-block renders <pre><code>', () => {
        const node: EditorNode = {
            id: 'code-1',
            type: 'codeBlock',
            children: [{ id: 'text-1', type: 'text', text: 'const x = 1;' }],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('pre')).toHaveAttribute('data-node-id', 'code-1');
        expect(container.querySelector('code')).toHaveAttribute('data-node-id', 'code-1');
    });

    it('blockquote renders <blockquote>', () => {
        const node: EditorNode = {
            id: 'quote-1',
            type: 'blockquote',
            children: [{ id: 'text-1', type: 'text', text: 'Quote text' }],
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('blockquote')).toHaveAttribute('data-node-id', 'quote-1');
    });

    it('horizontal-rule renders <hr> with no children', () => {
        const node: EditorNode = {
            id: 'hr-1',
            type: 'horizontalRule',
        };
        const { container } = render(renderNode(node, 'key'));
        expect(container.querySelector('hr')).toHaveAttribute('data-node-id', 'hr-1');
    });

    // Table tests (CSS Grid)
    it('table renders as div with role=table', () => {
        const node: EditorNode = {
            id: 'table-1',
            type: 'table',
            attrs: { columns: 3 },
            children: [],
        };
        const { container } = render(renderNode(node, 'key'));
        const tableDiv = container.querySelector('[role="table"]');
        expect(tableDiv).toHaveAttribute('data-node-id', 'table-1');
    });

    it('table-row renders as div with role=row and display:contents', () => {
        const node: EditorNode = {
            id: 'row-1',
            type: 'tableRow',
            children: [],
        };
        const { container } = render(renderNode(node, 'key'));
        const rowDiv = container.querySelector('[role="row"]');
        expect(rowDiv).toHaveAttribute('data-node-id', 'row-1');
        expect(rowDiv).toHaveStyle({ display: 'contents' });
    });

    it('table-cell renders as div with role=cell', () => {
        const node: EditorNode = {
            id: 'cell-1',
            type: 'tableCell',
            children: [{ id: 'text-1', type: 'text', text: 'Cell' }],
        };
        const { container } = render(renderNode(node, 'key'));
        const cellDiv = container.querySelector('[role="cell"]');
        expect(cellDiv).toHaveAttribute('data-node-id', 'cell-1');
    });

    it('table sets gridTemplateColumns from node.attrs.columns', () => {
        const node: EditorNode = {
            id: 'table-1',
            type: 'table',
            attrs: { columns: 4 },
            children: [],
        };
        const { container } = render(renderNode(node, 'key'));
        const tableDiv = container.querySelector('[role="table"]');
        expect(tableDiv).toHaveStyle({ gridTemplateColumns: 'repeat(4, 1fr)' });
    });
});
