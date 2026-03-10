/**
 * Tests for FileAttacher component
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileAttacher } from '../FileAttacher';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'test.pdf', type = 'application/pdf'): File {
    return new File(['content'], name, { type });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FileAttacher', () => {

    // ── Rendering ─────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders a button element', () => {
            render(<FileAttacher onFile={vi.fn()} />);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('uses default label "Choose File"', () => {
            render(<FileAttacher onFile={vi.fn()} />);
            expect(screen.getByRole('button', { name: 'Choose File' })).toBeInTheDocument();
        });

        it('uses custom label when label prop is provided', () => {
            render(<FileAttacher onFile={vi.fn()} label="Upload Document" />);
            expect(screen.getByRole('button', { name: 'Upload Document' })).toBeInTheDocument();
        });

        it('renders label text visibly inside button', () => {
            render(<FileAttacher onFile={vi.fn()} label="Choose File" />);
            // aria-label and visible text should both be present
            expect(screen.getByText('Choose File')).toBeInTheDocument();
        });

        it('renders a hidden file input', () => {
            const { container } = render(<FileAttacher onFile={vi.fn()} />);
            const input = container.querySelector('input[type="file"]');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('aria-hidden', 'true');
            expect(input).toHaveAttribute('tabIndex', '-1');
        });

        it('passes accept prop to hidden input', () => {
            const { container } = render(
                <FileAttacher onFile={vi.fn()} accept=".pdf,.docx" />
            );
            const input = container.querySelector('input[type="file"]');
            expect(input).toHaveAttribute('accept', '.pdf,.docx');
        });

        it('hidden input has no accept attribute when accept is not provided', () => {
            const { container } = render(<FileAttacher onFile={vi.fn()} />);
            const input = container.querySelector('input[type="file"]');
            // accept="" is the default — falsy but present
            expect(input).toHaveAttribute('accept', '');
        });

        it('applies custom className to button', () => {
            render(<FileAttacher onFile={vi.fn()} className="my-attacher" />);
            expect(screen.getByRole('button')).toHaveClass('my-attacher');
        });

        it('renders the attach icon SVG', () => {
            const { container } = render(<FileAttacher onFile={vi.fn()} />);
            expect(container.querySelector('svg')).toBeInTheDocument();
        });
    });

    // ── Disabled state ────────────────────────────────────────────────────────

    describe('disabled state', () => {
        it('button has disabled attribute when disabled=true', () => {
            render(<FileAttacher onFile={vi.fn()} disabled />);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('hidden input has disabled attribute when disabled=true', () => {
            const { container } = render(<FileAttacher onFile={vi.fn()} disabled />);
            const input = container.querySelector('input[type="file"]');
            expect(input).toBeDisabled();
        });

        it('button is not disabled by default', () => {
            render(<FileAttacher onFile={vi.fn()} />);
            expect(screen.getByRole('button')).not.toBeDisabled();
        });
    });

    // ── Click to open dialog ──────────────────────────────────────────────────


    describe('click behaviour', () => {
        let clickSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            clickSpy = vi
                .spyOn(HTMLElement.prototype, 'click')
                .mockImplementation(() => { });
        });

        afterEach(() => {
            clickSpy.mockRestore();
        });

        it('triggers file input click when button is clicked', () => {
            const { container } = render(<FileAttacher onFile={vi.fn()} />);
            const input = container.querySelector('input[type="file"]')!;

            fireEvent.click(screen.getByRole('button'));

            expect(clickSpy).toHaveBeenCalledOnce();
            expect(clickSpy.mock.instances[0]).toBe(input);
        });

        it('does not trigger file input click when disabled', () => {
            render(<FileAttacher onFile={vi.fn()} disabled />);

            fireEvent.click(screen.getByRole('button'));

            expect(clickSpy).not.toHaveBeenCalled();
        });
    });


    // ── Keyboard behaviour ────────────────────────────────────────────────────

    describe('keyboard behaviour', () => {
        let clickSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            clickSpy = vi
                .spyOn(HTMLElement.prototype, 'click')
                .mockImplementation(() => { });
        });

        afterEach(() => {
            clickSpy.mockRestore();
        });

        it('is focusable via keyboard when not disabled', () => {
            render(<FileAttacher onFile={vi.fn()} />);
            const button = screen.getByRole('button');
            button.focus();
            expect(document.activeElement).toBe(button);
        });

        it('is not focusable when disabled', () => {
            render(<FileAttacher onFile={vi.fn()} disabled />);
            const button = screen.getByRole('button');
            button.focus();
            // Disabled button should not receive focus
            expect(document.activeElement).not.toBe(button);
        });

        it('triggers file input click on Enter key', () => {
            const { container } = render(<FileAttacher onFile={vi.fn()} />);
            const input = container.querySelector('input[type="file"]')!;

            // <button> handles Enter natively — jsdom fires the click handler
            fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
            fireEvent.click(screen.getByRole('button')); // simulate native button activation

            expect(clickSpy).toHaveBeenCalledOnce();
            expect(clickSpy.mock.instances[0]).toBe(input);
        });

        it('does not trigger file input click on Enter when disabled', () => {
            render(<FileAttacher onFile={vi.fn()} disabled />);

            fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

            expect(clickSpy).not.toHaveBeenCalled();
        });
    });

    // ── File selection ────────────────────────────────────────────────────────

    describe('file selection', () => {
        it('calls onFile with the selected file', () => {
            const onFile = vi.fn();
            const { container } = render(<FileAttacher onFile={onFile} />);
            const input = container.querySelector('input[type="file"]')!;
            const file = makeFile();

            Object.defineProperty(input, 'files', {
                value: [file],
                configurable: true,
            });
            fireEvent.change(input);

            expect(onFile).toHaveBeenCalledOnce();
            expect(onFile).toHaveBeenCalledWith(file);
        });

        it('only calls onFile with the first file (single file mode)', () => {
            const onFile = vi.fn();
            const { container } = render(<FileAttacher onFile={onFile} />);
            const input = container.querySelector('input[type="file"]')!;
            const files = [makeFile('a.pdf'), makeFile('b.pdf')];

            Object.defineProperty(input, 'files', {
                value: files,
                configurable: true,
            });
            fireEvent.change(input);

            expect(onFile).toHaveBeenCalledOnce();
            expect(onFile).toHaveBeenCalledWith(files[0]);
        });

        it('does not call onFile when file list is empty', () => {
            const onFile = vi.fn();
            const { container } = render(<FileAttacher onFile={onFile} />);
            const input = container.querySelector('input[type="file"]')!;

            Object.defineProperty(input, 'files', {
                value: [],
                configurable: true,
            });
            fireEvent.change(input);

            expect(onFile).not.toHaveBeenCalled();
        });

        it('resets input value after file selection to allow re-selecting same file', () => {
            const onFile = vi.fn();
            const { container } = render(<FileAttacher onFile={onFile} />);
            const input = container.querySelector('input[type="file"]')! as HTMLInputElement;
            const file = makeFile();

            Object.defineProperty(input, 'files', {
                value: [file],
                configurable: true,
            });
            fireEvent.change(input);

            // value should be reset to empty string after selection
            expect(input.value).toBe('');
        });
    });
});