/**
 * Tests for DropZone component
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DropZone } from '../DropZone';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'test.pdf', type = 'application/pdf', size = 1024): File {
    return new File(['content'], name, { type, lastModified: Date.now() });
}

/**
 * Creates a synthetic DragEvent with a controlled dataTransfer.
 * jsdom does not implement dataTransfer natively so we construct it manually.
 */
function makeDragEvent(
    eventType: string,
    files: File[] = [],
): Event & { dataTransfer: DataTransfer } {
    const event = new Event(eventType, { bubbles: true, cancelable: true });

    const items = files.map((file) => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
    }));

    Object.defineProperty(event, 'dataTransfer', {
        value: {
            files,
            items,
            dropEffect: '',
        },
        writable: true,
    });

    return event as Event & { dataTransfer: DataTransfer };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DropZone', () => {

    // ── Rendering ─────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders with role="button"', () => {
            render(<DropZone />);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('uses default aria-label "Drop files here"', () => {
            render(<DropZone />);
            expect(screen.getByRole('button', { name: 'Drop files here' })).toBeInTheDocument();
        });

        it('uses custom label when label prop is provided', () => {
            render(<DropZone label="Upload your CV" />);
            expect(screen.getByRole('button', { name: 'Upload your CV' })).toBeInTheDocument();
        });

        it('renders default content when no children provided', () => {
            render(<DropZone />);
            expect(screen.getByText(/drop files here or/i)).toBeInTheDocument();
            expect(screen.getByText(/browse/i)).toBeInTheDocument();
        });

        it('renders children instead of default content', () => {
            render(
                <DropZone>
                    <span data-testid="custom-child">Custom content</span>
                </DropZone>
            );
            expect(screen.getByTestId('custom-child')).toBeInTheDocument();
            expect(screen.queryByText(/drop files here or/i)).not.toBeInTheDocument();
        });

        it('has tabIndex=0 when not disabled', () => {
            render(<DropZone />);
            expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
        });

        it('has tabIndex=-1 when disabled', () => {
            render(<DropZone disabled />);
            expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1');
        });

        it('sets aria-disabled=true when disabled', () => {
            render(<DropZone disabled />);
            expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
        });

        it('sets aria-disabled=false when not disabled', () => {
            render(<DropZone />);
            expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'false');
        });

        it('applies custom className', () => {
            render(<DropZone className="my-zone" />);
            expect(screen.getByRole('button')).toHaveClass('my-zone');
        });

        it('renders a hidden file input', () => {
            const { container } = render(<DropZone />);
            const input = container.querySelector('input[type="file"]');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('aria-hidden', 'true');
            expect(input).toHaveAttribute('tabIndex', '-1');
        });

        it('passes accept prop to hidden input', () => {
            const { container } = render(<DropZone accept={['.pdf', '.docx']} />);
            const input = container.querySelector('input[type="file"]');
            expect(input).toHaveAttribute('accept', '.pdf,.docx');
        });

        it('passes multiple prop to hidden input', () => {
            const { container } = render(<DropZone multiple />);
            const input = container.querySelector('input[type="file"]');
            expect(input).toHaveAttribute('multiple');
        });

        it('drag overlay is not visible on initial render', () => {
            render(<DropZone />);
            expect(screen.queryByText('Drop to upload')).not.toBeInTheDocument();
        });
    });

    // ── Click to browse ───────────────────────────────────────────────────────

    // DropZone.test.tsx and FileAttacher.test.tsx — add inside the relevant describe blocks

    describe('click to browse', () => {
        let clickSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            clickSpy = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => { });
        });

        afterEach(() => {
            clickSpy.mockRestore();
        });

        it('triggers file input click when zone is clicked', () => {
            render(<DropZone />);
            fireEvent.click(screen.getByRole('button'));
            expect(clickSpy).toHaveBeenCalledOnce();
        });

        it('does not trigger file input click when disabled', () => {
            render(<DropZone disabled />);
            fireEvent.click(screen.getByRole('button'));
            expect(clickSpy).not.toHaveBeenCalled();
        });
    });

    // ── Keyboard interaction ──────────────────────────────────────────────────

    describe('keyboard interaction', () => {
        let clickSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            clickSpy = vi
                .spyOn(HTMLElement.prototype, 'click')
                .mockImplementation(() => { });
        });

        afterEach(() => {
            clickSpy.mockRestore();
        });

        it('triggers file input click on Enter key', () => {
            const { container } = render(<DropZone />);
            const input = container.querySelector('input[type="file"]')!;

            fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

            // Assert click was called and the receiver was the file input
            expect(clickSpy).toHaveBeenCalledOnce();
            expect(clickSpy.mock.instances[0]).toBe(input);
        });

        it('triggers file input click on Space key', () => {
            const { container } = render(<DropZone />);
            const input = container.querySelector('input[type="file"]')!;

            fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });

            expect(clickSpy).toHaveBeenCalledOnce();
            expect(clickSpy.mock.instances[0]).toBe(input);
        });

        it('does not trigger file input click on other keys', () => {
            render(<DropZone />);

            fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });

            expect(clickSpy).not.toHaveBeenCalled();
        });

        it('does not trigger file input click on Enter when disabled', () => {
            render(<DropZone disabled />);

            fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

            expect(clickSpy).not.toHaveBeenCalled();
        });

        it('does not trigger file input click on Space when disabled', () => {
            render(<DropZone disabled />);

            fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });

            expect(clickSpy).not.toHaveBeenCalled();
        });
    });

    // ── File input change ─────────────────────────────────────────────────────

    describe('file input change', () => {
        it('calls onFiles when a file is selected via input', () => {
            const onFiles = vi.fn();
            const { container } = render(<DropZone onFiles={onFiles} />);
            const input = container.querySelector('input[type="file"]')!;
            const file = makeFile();

            Object.defineProperty(input, 'files', { value: [file], configurable: true });
            fireEvent.change(input);

            expect(onFiles).toHaveBeenCalledOnce();
            expect(onFiles).toHaveBeenCalledWith([file]);
        });

        it('only passes first file when multiple=false', () => {
            const onFiles = vi.fn();
            const { container } = render(<DropZone onFiles={onFiles} multiple={false} />);
            const input = container.querySelector('input[type="file"]')!;
            const files = [makeFile('a.pdf'), makeFile('b.pdf')];

            Object.defineProperty(input, 'files', { value: files, configurable: true });
            fireEvent.change(input);

            expect(onFiles).toHaveBeenCalledWith([files[0]]);
        });

        it('passes all files when multiple=true', () => {
            const onFiles = vi.fn();
            const { container } = render(<DropZone onFiles={onFiles} multiple />);
            const input = container.querySelector('input[type="file"]')!;
            const files = [makeFile('a.pdf'), makeFile('b.pdf')];

            Object.defineProperty(input, 'files', { value: files, configurable: true });
            fireEvent.change(input);

            expect(onFiles).toHaveBeenCalledWith(files);
        });

        it('does not call onFiles when no file is selected', () => {
            const onFiles = vi.fn();
            const { container } = render(<DropZone onFiles={onFiles} />);
            const input = container.querySelector('input[type="file"]')!;

            Object.defineProperty(input, 'files', { value: [], configurable: true });
            fireEvent.change(input);

            expect(onFiles).not.toHaveBeenCalled();
        });
    });

    // ── Drag and drop ─────────────────────────────────────────────────────────

    describe('drag and drop', () => {
        it('shows overlay when files are dragged over', () => {
            render(<DropZone />);
            const zone = screen.getByRole('button');
            const dragEnter = makeDragEvent('dragenter', [makeFile()]);

            act(() => { fireEvent(zone, dragEnter); });

            expect(screen.getByText('Drop to upload')).toBeInTheDocument();
        });

        it('hides overlay when drag leaves the zone boundary', () => {
            render(<DropZone />);
            const zone = screen.getByRole('button');

            act(() => { fireEvent(zone, makeDragEvent('dragenter', [makeFile()])); });
            expect(screen.getByText('Drop to upload')).toBeInTheDocument();

            act(() => { fireEvent(zone, makeDragEvent('dragleave', [])); });
            expect(screen.queryByText('Drop to upload')).not.toBeInTheDocument();
        });

        it('sets data-dragging on content wrapper during drag', () => {
            const { container } = render(<DropZone />);
            const zone = screen.getByRole('button');
            const content = container.querySelector('[class*="content"]')!;

            act(() => { fireEvent(zone, makeDragEvent('dragenter', [makeFile()])); });

            expect(content).toHaveAttribute('data-dragging');
        });

        it('removes data-dragging from content wrapper after drag leaves', () => {
            const { container } = render(<DropZone />);
            const zone = screen.getByRole('button');
            const content = container.querySelector('[class*="content"]')!;

            act(() => { fireEvent(zone, makeDragEvent('dragenter', [makeFile()])); });
            act(() => { fireEvent(zone, makeDragEvent('dragleave', [])); });

            expect(content).not.toHaveAttribute('data-dragging');
        });

        it('calls onFiles when files are dropped', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} />);
            const zone = screen.getByRole('button');
            const file = makeFile();

            act(() => { fireEvent(zone, makeDragEvent('drop', [file])); });

            expect(onFiles).toHaveBeenCalledWith([file]);
        });

        it('only passes first file on drop when multiple=false', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} multiple={false} />);
            const zone = screen.getByRole('button');
            const files = [makeFile('a.pdf'), makeFile('b.pdf')];

            act(() => { fireEvent(zone, makeDragEvent('drop', files)); });

            expect(onFiles).toHaveBeenCalledWith([files[0]]);
        });

        it('passes all files on drop when multiple=true', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} multiple />);
            const zone = screen.getByRole('button');
            const files = [makeFile('a.pdf'), makeFile('b.pdf')];

            act(() => { fireEvent(zone, makeDragEvent('drop', files)); });

            expect(onFiles).toHaveBeenCalledWith(files);
        });

        it('hides overlay after drop', () => {
            render(<DropZone />);
            const zone = screen.getByRole('button');
            const file = makeFile();

            act(() => { fireEvent(zone, makeDragEvent('dragenter', [file])); });
            expect(screen.getByText('Drop to upload')).toBeInTheDocument();

            act(() => { fireEvent(zone, makeDragEvent('drop', [file])); });
            expect(screen.queryByText('Drop to upload')).not.toBeInTheDocument();
        });

        it('does not respond to drag events when disabled', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} disabled />);
            const zone = screen.getByRole('button');

            act(() => { fireEvent(zone, makeDragEvent('dragenter', [makeFile()])); });
            expect(screen.queryByText('Drop to upload')).not.toBeInTheDocument();

            act(() => { fireEvent(zone, makeDragEvent('drop', [makeFile()])); });
            expect(onFiles).not.toHaveBeenCalled();
        });

        it('does not call onFiles when dropped file does not match accept filter', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['.pdf']} />);
            const zone = screen.getByRole('button');
            const txtFile = makeFile('doc.txt', 'text/plain');

            act(() => { fireEvent(zone, makeDragEvent('drop', [txtFile])); });

            expect(onFiles).not.toHaveBeenCalled();
        });
    });

    // ── File filtering ────────────────────────────────────────────────────────

    describe('file filtering', () => {
        it('accepts all files when accept is empty', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={[]} />);
            const zone = screen.getByRole('button');
            const file = makeFile('anything.xyz', 'application/octet-stream');

            act(() => { fireEvent(zone, makeDragEvent('drop', [file])); });

            expect(onFiles).toHaveBeenCalledWith([file]);
        });

        it('accepts file matching exact MIME type', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['application/pdf']} />);
            const zone = screen.getByRole('button');
            const pdf = makeFile('doc.pdf', 'application/pdf');

            act(() => { fireEvent(zone, makeDragEvent('drop', [pdf])); });

            expect(onFiles).toHaveBeenCalledWith([pdf]);
        });

        it('rejects file not matching exact MIME type', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['application/pdf']} />);
            const zone = screen.getByRole('button');
            const png = makeFile('image.png', 'image/png');

            act(() => { fireEvent(zone, makeDragEvent('drop', [png])); });

            expect(onFiles).not.toHaveBeenCalled();
        });

        it('accepts file matching wildcard MIME type', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['image/*']} />);
            const zone = screen.getByRole('button');
            const png = makeFile('photo.png', 'image/png');

            act(() => { fireEvent(zone, makeDragEvent('drop', [png])); });

            expect(onFiles).toHaveBeenCalledWith([png]);
        });

        it('rejects file not matching wildcard MIME type', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['image/*']} />);
            const zone = screen.getByRole('button');
            const pdf = makeFile('doc.pdf', 'application/pdf');

            act(() => { fireEvent(zone, makeDragEvent('drop', [pdf])); });

            expect(onFiles).not.toHaveBeenCalled();
        });

        it('accepts file matching extension filter', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['.docx']} />);
            const zone = screen.getByRole('button');
            const docx = makeFile(
                'report.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            );

            act(() => { fireEvent(zone, makeDragEvent('drop', [docx])); });

            expect(onFiles).toHaveBeenCalledWith([docx]);
        });

        it('rejects file not matching extension filter', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['.docx']} />);
            const zone = screen.getByRole('button');
            const pdf = makeFile('doc.pdf', 'application/pdf');

            act(() => { fireEvent(zone, makeDragEvent('drop', [pdf])); });

            expect(onFiles).not.toHaveBeenCalled();
        });

        it('extension matching is case-insensitive', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['.PDF']} />);
            const zone = screen.getByRole('button');
            const pdf = makeFile('doc.pdf', 'application/pdf');

            act(() => { fireEvent(zone, makeDragEvent('drop', [pdf])); });

            expect(onFiles).toHaveBeenCalledWith([pdf]);
        });

        it('filters mixed batch — only matching files passed to onFiles', () => {
            const onFiles = vi.fn();
            render(<DropZone onFiles={onFiles} accept={['.pdf']} multiple />);
            const zone = screen.getByRole('button');
            const pdf = makeFile('doc.pdf', 'application/pdf');
            const txt = makeFile('note.txt', 'text/plain');

            act(() => { fireEvent(zone, makeDragEvent('drop', [pdf, txt])); });

            expect(onFiles).toHaveBeenCalledWith([pdf]);
        });
    });

    // ── onFiles not provided ──────────────────────────────────────────────────

    describe('onFiles not provided', () => {
        it('does not throw when onFiles is undefined and files are dropped', () => {
            render(<DropZone />);
            const zone = screen.getByRole('button');

            expect(() => {
                act(() => { fireEvent(zone, makeDragEvent('drop', [makeFile()])); });
            }).not.toThrow();
        });
    });
});