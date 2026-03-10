/**
 * Toolbar component tests.
 * @package @xy-editor/react
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithEditor } from '../../../test/utils';
import { Toolbar, ToolbarDivider } from '../index';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Bold: () => <span data-testid="icon">Bold</span>,
    Italic: () => <span data-testid="icon">Italic</span>,
    Underline: () => <span data-testid="icon">Underline</span>,
    Strikethrough: () => <span data-testid="icon">Strikethrough</span>,
    AlignLeft: () => <span data-testid="icon">AlignLeft</span>,
    AlignCenter: () => <span data-testid="icon">AlignCenter</span>,
    AlignRight: () => <span data-testid="icon">AlignRight</span>,
    AlignJustify: () => <span data-testid="icon">AlignJustify</span>,
    List: () => <span data-testid="icon">List</span>,
    ListOrdered: () => <span data-testid="icon">ListOrdered</span>,
    Undo2: () => <span data-testid="icon">Undo2</span>,
    Redo2: () => <span data-testid="icon">Redo2</span>,
}));

describe('Toolbar', () => {
    it('renders with role="toolbar" and aria-label="Text formatting"', () => {
        renderWithEditor(<Toolbar />);

        const toolbar = screen.getByRole('toolbar', { name: 'Text formatting' });
        expect(toolbar).toBeInTheDocument();
    });

    it('renders default groups when groups prop is omitted', () => {
        renderWithEditor(<Toolbar />);

        // Should have toolbar buttons for default groups
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders ToolbarDividers between groups (count = groups.length - 1)', () => {
        const groups = [
            { id: 'group1', buttons: [<button key="b1">Button 1</button>] },
            { id: 'group2', buttons: [<button key="b2">Button 2</button>] },
            { id: 'group3', buttons: [<button key="b3">Button 3</button>] },
        ];

        const { container } = renderWithEditor(<Toolbar groups={groups} />);

        // Should have 2 dividers (3 groups - 1)
        const dividers = container.querySelectorAll('[role="separator"]');
        expect(dividers.length).toBe(2);
    });

    it('renders custom children after groups', () => {
        renderWithEditor(
            <Toolbar>
                <button>Custom Button</button>
            </Toolbar>
        );

        expect(screen.getByText('Custom Button')).toBeInTheDocument();
    });

    it('renders custom groups when groups prop is provided', () => {
        const groups = [
            {
                id: 'custom',
                buttons: [
                    <button key="custom-btn" aria-label="Custom">Custom</button>
                ]
            },
        ];

        renderWithEditor(<Toolbar groups={groups} />);

        expect(screen.getByLabelText('Custom')).toBeInTheDocument();
    });

    it('renders empty toolbar when groups={[]} and no children', () => {
        const { container } = renderWithEditor(<Toolbar groups={[]} />);

        const toolbar = screen.getByRole('toolbar');
        expect(toolbar).toBeInTheDocument();
        expect(toolbar.children.length).toBe(0);
    });
});
