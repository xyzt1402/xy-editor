/**
 * ColorButton component tests.
 * @package @xy-editor/react
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithEditor } from '../../../test/utils';
import { ColorButton } from '../index';

describe('ColorButton', () => {
    describe('type="text"', () => {
        it('renders with aria-label="Text color" when type="text"', () => {
            renderWithEditor(<ColorButton type="text" />);

            expect(screen.getByLabelText('Text color')).toBeInTheDocument();
        });
    });

    describe('type="highlight"', () => {
        it('renders with aria-label="Highlight color" when type="highlight"', () => {
            renderWithEditor(<ColorButton type="highlight" />);

            expect(screen.getByLabelText('Highlight color')).toBeInTheDocument();
        });
    });

    it('popover is not visible on initial render', () => {
        renderWithEditor(<ColorButton type="text" />);

        const button = screen.getByLabelText('Text color');

        // Popover should not be visible (aria-expanded should be false or undefined)
        expect(button).not.toHaveAttribute('aria-expanded', 'true');
    });

    it('popover opens on button click', async () => {
        renderWithEditor(<ColorButton type="text" />);

        const button = screen.getByLabelText('Text color');
        fireEvent.click(button);

        await waitFor(() => {
            expect(button).toHaveAttribute('aria-expanded', 'true');
        });
    });

    it('popover closes on Escape key', async () => {
        renderWithEditor(<ColorButton type="text" />);

        const button = screen.getByLabelText('Text color');
        fireEvent.click(button);

        await waitFor(() => {
            expect(button).toHaveAttribute('aria-expanded', 'true');
        });

        fireEvent.keyDown(document, { key: 'Escape' });

        await waitFor(() => {
            expect(button).not.toHaveAttribute('aria-expanded', 'true');
        });
    });

    it('popover closes on click outside', async () => {
        renderWithEditor(<ColorButton type="text" />);

        const button = screen.getByLabelText('Text color');
        fireEvent.click(button);

        await waitFor(() => {
            expect(button).toHaveAttribute('aria-expanded', 'true');
        });

        // Click outside
        fireEvent.mouseDown(document.body);

        await waitFor(() => {
            expect(button).not.toHaveAttribute('aria-expanded', 'true');
        });
    });

    it('popover closes after swatch selection', async () => {
        renderWithEditor(<ColorButton type="text" />);

        const button = screen.getByLabelText('Text color');
        fireEvent.click(button);

        await waitFor(() => {
            expect(button).toHaveAttribute('aria-expanded', 'true');
        });

        // Click a swatch
        const swatch = screen.getByLabelText('Select color #000000');
        fireEvent.click(swatch);

        await waitFor(() => {
            expect(button).not.toHaveAttribute('aria-expanded', 'true');
        });
    });

    it('popover contains exactly 20 color swatches', async () => {
        renderWithEditor(<ColorButton type="text" />);

        const button = screen.getByLabelText('Text color');
        fireEvent.click(button);

        await waitFor(() => {
            const swatches = screen.getAllByRole('option');
            expect(swatches.length).toBe(20);
        });
    });

    it('native <input type="color"> is present in popover', async () => {
        renderWithEditor(<ColorButton type="text" />);

        const button = screen.getByLabelText('Text color');
        fireEvent.click(button);

        await waitFor(() => {
            const colorInput = screen.getByLabelText('Custom color');
            expect(colorInput).toBeInTheDocument();
            expect(colorInput.tagName).toBe('INPUT');
            expect(colorInput).toHaveAttribute('type', 'color');
        });
    });
});
