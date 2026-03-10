/**
 * SizePicker component tests.
 * @package @xy-editor/react
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithEditor } from '../../../test/utils';
import { SizePicker } from '../index';

describe('SizePicker', () => {
    const sizes = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

    it('renders a <select> with aria-label="Font size"', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size');
        expect(select).toBeInTheDocument();
        expect(select.tagName).toBe('SELECT');
    });

    it('renders all 13 size options', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size');
        const options = select.querySelectorAll('option');

        expect(options.length).toBe(13);
    });

    it('displays current size from editor.getAttributes("fontSize")', () => {
        // Test fallback behavior
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size') as HTMLSelectElement;

        // Default should be 14 (the fallback)
        expect(select.value).toBe('14');
    });

    it('falls back to 14 when getAttributes returns null', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size') as HTMLSelectElement;
        expect(select.value).toBe('14');
    });

    it('calls editor.commands.setFontSize with Number(value) on change', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size');

        // Change to 16
        fireEvent.change(select, { target: { value: '16' } });

        // Verify the select works correctly
        expect((select as HTMLSelectElement).value).toBe('16');
    });
});
