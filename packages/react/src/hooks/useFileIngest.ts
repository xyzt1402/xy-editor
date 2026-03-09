/**
 * Hook to ingest files into the editor.
 * @package @xy-editor/react
 * @module hooks/useFileIngest
 */

import { useState, useCallback } from 'react';
import { useEditorContext } from '../context/EditorContext';
import { ingestFile, FileIngestionError } from '@xy-editor/file-ingestion';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseFileIngestReturn {
    /** Ingests a file and replaces the editor document on success */
    ingest: (file: File) => Promise<void>;
    /** True while a file is being parsed and converted */
    isLoading: boolean;
    /**
     * The last ingestion error, or null if no error.
     * Automatically cleared at the start of each new ingest call.
     */
    error: Error | null;
    /** Manually clears the current error */
    clearError: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to ingest files into the editor.
 *
 * On success, replaces the entire editor document with the ingested content
 * via context's setState (bypasses applyTransaction — this is a wholesale
 * state replacement, not an incremental edit).
 *
 * On failure, sets the error state. The editor document is left unchanged.
 *
 * @example
 * ```tsx
 * const { ingest, isLoading, error, clearError } = useFileIngest();
 *
 * const handleDrop = async (file: File) => {
 *   await ingest(file);
 * };
 *
 * return (
 *   <>
 *     {isLoading && <Spinner />}
 *     {error && <ErrorBanner message={error.message} onDismiss={clearError} />}
 *   </>
 * );
 * ```
 */
export function useFileIngest(): UseFileIngestReturn {
    // setState replaces state wholesale — used here because file ingestion
    // produces a complete new EditorState, not an incremental transaction.
    const { setState } = useEditorContext();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const clearError = useCallback(() => setError(null), []);

    const ingest = useCallback(
        async (file: File): Promise<void> => {
            setIsLoading(true);
            setError(null); // clear previous error on new attempt

            try {
                // ingestFile: File → RawContent → EditorState
                // Return type is already EditorState — no cast needed
                const newState = await ingestFile(file);
                setState(newState);
            } catch (err) {
                // Preserve FileIngestionError details (code, file ref) if available,
                // otherwise wrap unknown errors in a plain Error
                const ingestionError =
                    err instanceof FileIngestionError
                        ? err
                        : err instanceof Error
                            ? err
                            : new Error('An unexpected error occurred while ingesting the file.');

                setError(ingestionError);
                console.error('[useFileIngest] Failed to ingest file:', ingestionError);
            } finally {
                setIsLoading(false);
            }
        },
        [setState],
    );

    return { ingest, isLoading, error, clearError };
}