/**
 * Hook to access the current editor state.
 * @package @xy-editor/react
 * @module hooks/useEditorState
 */

import { useEditorContext } from '../context/EditorContext';
import type { EditorState } from '@xy-editor/core';

/**
 * Hook to get the current editor state.
 *
 * This is a thin convenience wrapper around useEditorContext.
 * Use this when you only need to read state and don't need
 * access to dispatch or setState.
 *
 * @returns The current EditorState
 * @throws If used outside of an EditorProvider
 *
 * @example
 * ```tsx
 * function WordCount() {
 *   const state = useEditorState();
 *   return <span>{countWords(state.doc)}</span>;
 * }
 * ```
 */
export function useEditorState(): EditorState {
    const { state } = useEditorContext();
    return state;
}