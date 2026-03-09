/**
 * Tests for useFileIngest hook
 * @package @xy-editor/react
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileIngest } from '../useFileIngest';
import { createEmptyState } from '@xy-editor/core';
import { makeWrapper, makeWrapperWithOnChange } from './utils';
import type { EditorState } from '@xy-editor/core';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the entire file-ingestion package — prevents real parsers
// (pdfjs, mammoth) from loading during unit tests
vi.mock('@xy-editor/file-ingestion', () => ({
    ingestFile: vi.fn(),
    FileIngestionError: class FileIngestionError extends Error {
        code: string;
        constructor(message: string, code: string) {
            super(message);
            this.name = 'FileIngestionError';
            this.code = code;
        }
    },
}));

import { ingestFile, FileIngestionError } from '@xy-editor/file-ingestion';
const mockIngestFile = ingestFile as Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(
    name = 'test.txt',
    content = 'Hello',
    type = 'text/plain',
): File {
    return new File([content], name, { type });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useFileIngest', () => {

    beforeEach(() => {
        mockIngestFile.mockReset();
    });

    // ── Initial state ─────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('returns isLoading: false, error: null, ingest and clearError functions', () => {
            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(typeof result.current.ingest).toBe('function');
            expect(typeof result.current.clearError).toBe('function');
        });
    });

    // ── isLoading ─────────────────────────────────────────────────────────────

    describe('isLoading', () => {
        it('is true while ingestFile is in progress', async () => {
            let resolveIngest!: (state: EditorState) => void;
            mockIngestFile.mockReturnValue(
                new Promise<EditorState>((res) => { resolveIngest = res; }),
            );

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            act(() => { void result.current.ingest(makeFile()); });

            expect(result.current.isLoading).toBe(true);

            await act(async () => { resolveIngest(createEmptyState()); });

            expect(result.current.isLoading).toBe(false);
        });

        it('returns to false after successful ingest', async () => {
            mockIngestFile.mockResolvedValue(createEmptyState());

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(makeFile()); });

            expect(result.current.isLoading).toBe(false);
        });

        it('returns to false after failed ingest', async () => {
            mockIngestFile.mockRejectedValue(new Error('parse error'));

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(makeFile()); });

            expect(result.current.isLoading).toBe(false);
        });
    });

    // ── Success ───────────────────────────────────────────────────────────────

    describe('successful ingest', () => {
        it('calls setState with the ingested EditorState', async () => {
            const ingestedState = createEmptyState();
            mockIngestFile.mockResolvedValue(ingestedState);

            const { Wrapper, onChange } = makeWrapperWithOnChange();

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: Wrapper,
            });

            await act(async () => {
                await result.current.ingest(makeFile('doc.pdf', '', 'application/pdf'));
            });

            expect(onChange).toHaveBeenCalledOnce();
            expect(onChange.mock.calls[0]![0]!).toBe(ingestedState);
        });

        it('passes the correct file to ingestFile', async () => {
            mockIngestFile.mockResolvedValue(createEmptyState());
            const file = makeFile('my-doc.docx', '', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(file); });

            expect(mockIngestFile).toHaveBeenCalledWith(file);
        });

        it('clears any previous error on successful ingest', async () => {
            mockIngestFile.mockRejectedValueOnce(new Error('first failure'));

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(makeFile()); });
            expect(result.current.error).not.toBeNull();

            mockIngestFile.mockResolvedValue(createEmptyState());
            await act(async () => { await result.current.ingest(makeFile()); });

            expect(result.current.error).toBeNull();
        });
    });

    // ── Error handling ────────────────────────────────────────────────────────

    describe('error handling', () => {
        it('sets error when ingestFile rejects with a plain Error', async () => {
            const parseError = new Error('Failed to parse file');
            mockIngestFile.mockRejectedValue(parseError);

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(makeFile()); });

            expect(result.current.error).toBe(parseError);
        });

        it('preserves FileIngestionError with its error code', async () => {
            const ingestionError = new FileIngestionError('File is empty', 'FILE_EMPTY');
            mockIngestFile.mockRejectedValue(ingestionError);

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.ingest(makeFile('empty.txt', ''));
            });

            expect(result.current.error).toBe(ingestionError);
            expect((result.current.error as FileIngestionError).code).toBe('FILE_EMPTY');
        });

        it('wraps unknown thrown values in an Error', async () => {
            mockIngestFile.mockRejectedValue('something went wrong');

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(makeFile()); });

            expect(result.current.error).toBeInstanceOf(Error);
        });

        it('clears error at the start of a new ingest call', async () => {
            mockIngestFile.mockRejectedValueOnce(new Error('failure'));

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(makeFile()); });
            expect(result.current.error).not.toBeNull();

            let resolveIngest!: (state: EditorState) => void;
            mockIngestFile.mockReturnValue(
                new Promise<EditorState>((res) => { resolveIngest = res; }),
            );

            act(() => { void result.current.ingest(makeFile()); });

            // Cleared immediately when new ingest begins
            expect(result.current.error).toBeNull();

            await act(async () => { resolveIngest(createEmptyState()); });
        });
    });

    // ── clearError ────────────────────────────────────────────────────────────

    describe('clearError', () => {
        it('clears the error when called', async () => {
            mockIngestFile.mockRejectedValue(new Error('some error'));

            const { result } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            await act(async () => { await result.current.ingest(makeFile()); });
            expect(result.current.error).not.toBeNull();

            act(() => { result.current.clearError(); });

            expect(result.current.error).toBeNull();
        });

        it('clearError reference is stable across re-renders', () => {
            const { result, rerender } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            const clearErrorBefore = result.current.clearError;
            rerender();
            expect(result.current.clearError).toBe(clearErrorBefore);
        });
    });

    // ── Stability ─────────────────────────────────────────────────────────────

    describe('stability', () => {
        it('ingest reference is stable across re-renders', () => {
            const { result, rerender } = renderHook(() => useFileIngest(), {
                wrapper: makeWrapper(),
            });

            const ingestBefore = result.current.ingest;
            rerender();
            expect(result.current.ingest).toBe(ingestBefore);
        });
    });
});