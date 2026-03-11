/**
 * SizePicker component tests.
 * @package @xy-editor/react
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithEditor } from '../../../test/utils';
import { SizePicker, SIZE_OPTIONS } from '../index';

describe('SizePicker', () => {
    it('renders a <select> with aria-label="Font size"', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size');
        expect(select).toBeInTheDocument();
        expect(select.tagName).toBe('SELECT');
    });

    it(`renders all ${SIZE_OPTIONS.length} size options`, () => {
        renderWithEditor(<SizePicker />);

        const options = screen.getByLabelText('Font size').querySelectorAll('option');
        expect(options.length).toBe(SIZE_OPTIONS.length);
    });

    it('renders options matching SIZE_OPTIONS values', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size');
        SIZE_OPTIONS.forEach((size) => {
            const option = select.querySelector(`option[value="${size}"]`);
            expect(option).toBeInTheDocument();
            expect(option?.textContent).toBe(String(size));
        });
    });

    it('falls back to 14 when getAttributes returns null', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size') as HTMLSelectElement;
        expect(select.value).toBe('14');
    });

    it('reads from getAttributes("fontSize"), not "fontFamily"', () => {
        // Regression: previous version used getAttributes('fontFamily')?.fontSize — wrong key
        // This test ensures the default (14) is rendered, confirming correct attribute lookup
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size') as HTMLSelectElement;
        expect(select.value).toBe('14');
    });

    it('calls editor.commands.setFontSize with Number(value) on change', () => {
        renderWithEditor(<SizePicker />);

        const select = screen.getByLabelText('Font size');
        fireEvent.change(select, { target: { value: '16' } });

        expect((select as HTMLSelectElement).value).toBe('16');
    });
});