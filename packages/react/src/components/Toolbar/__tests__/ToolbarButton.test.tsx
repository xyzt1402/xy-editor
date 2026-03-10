/**
 * ToolbarButton component tests.
 * @package @xy-editor/react
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithEditor } from '../../../test/utils';
import { ToolbarButton } from '../index';

describe('ToolbarButton', () => {
    const defaultProps = {
        icon: <span>Icon</span>,
        label: 'Bold',
        onClick: vi.fn(),
    };

    it('renders with correct aria-label', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} />);

        expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        const onClick = vi.fn();
        renderWithEditor(<ToolbarButton {...defaultProps} onClick={onClick} />);

        fireEvent.click(screen.getByLabelText('Bold'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
        const onClick = vi.fn();
        renderWithEditor(<ToolbarButton {...defaultProps} onClick={onClick} disabled />);

        fireEvent.click(screen.getByLabelText('Bold'));

        expect(onClick).not.toHaveBeenCalled();
    });

    it('has data-active attribute when active={true}', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} active />);

        const button = screen.getByLabelText('Bold');
        expect(button).toHaveAttribute('data-active');
    });

    it('does NOT have data-active attribute when active={false}', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} active={false} />);

        const button = screen.getByLabelText('Bold');
        expect(button).not.toHaveAttribute('data-active');
    });

    it('has data-disabled attribute when disabled={true}', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} disabled />);

        const button = screen.getByLabelText('Bold');
        expect(button).toHaveAttribute('data-disabled');
    });

    it('tooltip text is present in DOM (for CSS-only tooltip)', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} />);

        // Tooltip should be in the DOM
        const tooltips = document.querySelectorAll('[data-tooltip]');
        expect(tooltips.length).toBeGreaterThan(0);
    });

    it('shortcut appears in tooltip when shortcut prop provided', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} shortcut="⌘B" />);

        const tooltip = document.querySelector('[data-tooltip]');
        expect(tooltip?.textContent).toBe('Bold ⌘B');
    });

    it('is focusable (tabIndex not -1) when not disabled', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} />);

        const button = screen.getByLabelText('Bold');
        expect(button.tabIndex).not.toBe(-1);
    });

    it('is not focusable when disabled', () => {
        renderWithEditor(<ToolbarButton {...defaultProps} disabled />);

        const button = screen.getByLabelText('Bold');
        expect(button).toBeDisabled();
    });
});
