/**
 * Tests for FileTypeChip component
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileTypeChip } from '../FileTypeChip';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FileTypeChip', () => {

    // ── Rendering ─────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders a span element', () => {
            const { container } = render(<FileTypeChip type="PDF" />);
            expect(container.querySelector('span')).toBeInTheDocument();
        });

        it('renders the type in uppercase', () => {
            render(<FileTypeChip type="pdf" />);
            expect(screen.getByText('PDF')).toBeInTheDocument();
        });

        it('normalises lowercase type to uppercase', () => {
            render(<FileTypeChip type="docx" />);
            expect(screen.getByText('DOCX')).toBeInTheDocument();
        });

        it('normalises mixed case type to uppercase', () => {
            render(<FileTypeChip type="Mp4" />);
            expect(screen.getByText('MP4')).toBeInTheDocument();
        });

        it('renders a colour dot element', () => {
            const { container } = render(<FileTypeChip type="PDF" />);
            // The dot is the aria-hidden span inside the chip
            const dot = container.querySelector('[aria-hidden="true"]');
            expect(dot).toBeInTheDocument();
        });

        it('dot has aria-hidden="true"', () => {
            const { container } = render(<FileTypeChip type="PDF" />);
            const dot = container.querySelector('span[aria-hidden="true"]');
            expect(dot).toHaveAttribute('aria-hidden', 'true');
        });
    });

    // ── data-type attribute ───────────────────────────────────────────────────

    describe('data-type attribute', () => {
        it('sets data-type to the normalised uppercase type', () => {
            const { container } = render(<FileTypeChip type="pdf" />);
            const chip = container.querySelector('[data-type]');
            expect(chip).toHaveAttribute('data-type', 'PDF');
        });

        it('sets data-type for each known type correctly', () => {
            const types = ['PDF', 'DOCX', 'XLSX', 'CSV', 'PNG', 'JPG', 'MP4', 'ZIP'];

            types.forEach((type) => {
                const { container } = render(<FileTypeChip type={type} />);
                const chip = container.querySelector('[data-type]');
                expect(chip).toHaveAttribute('data-type', type);
            });
        });

        it('sets data-type for unknown types', () => {
            const { container } = render(<FileTypeChip type="xyz" />);
            const chip = container.querySelector('[data-type]');
            expect(chip).toHaveAttribute('data-type', 'XYZ');
        });

        it('does NOT use inline style for colour — no style attribute on chip', () => {
            const { container } = render(<FileTypeChip type="PDF" />);
            // The outer chip span must have no style attribute —
            // colour is driven entirely by CSS via data-type
            const chip = container.querySelector('[data-type]');
            expect(chip).not.toHaveAttribute('style');
        });
    });

    // ── Title / accessibility ─────────────────────────────────────────────────

    describe('accessibility', () => {
        it('has a title attribute for tooltip on hover', () => {
            const { container } = render(<FileTypeChip type="PDF" />);
            const chip = container.querySelector('[data-type]');
            expect(chip).toHaveAttribute('title', 'File type: PDF');
        });

        it('title reflects normalised uppercase type', () => {
            const { container } = render(<FileTypeChip type="docx" />);
            const chip = container.querySelector('[data-type]');
            expect(chip).toHaveAttribute('title', 'File type: DOCX');
        });
    });

    // ── className ─────────────────────────────────────────────────────────────

    describe('className', () => {
        it('applies custom className', () => {
            const { container } = render(
                <FileTypeChip type="PDF" className="my-chip" />
            );
            const chip = container.querySelector('[data-type]');
            expect(chip).toHaveClass('my-chip');
        });

        it('applies custom className alongside module class', () => {
            const { container } = render(
                <FileTypeChip type="PDF" className="extra" />
            );
            const chip = container.querySelector('[data-type]');
            // Has both the module class and the custom class
            expect(chip?.className).toContain('extra');
        });

        it('works without className prop', () => {
            expect(() => render(<FileTypeChip type="PDF" />)).not.toThrow();
        });
    });
});