/**
 * Shared test utilities for @xy-editor/react component tests.
 * @package @xy-editor/react
 * @module test/utils
 */

import React from 'react';
import { render, cleanup, type RenderOptions } from '@testing-library/react';
import { EditorProvider } from '../context/EditorContext';
import { createEmptyState } from '@xy-editor/core';
import type { EditorState } from '@xy-editor/core';
import { vi, afterEach } from 'vitest';
import type { RenderResult } from '@testing-library/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type WrapperProps = { children: React.ReactNode };

// ─── makeWrapper ──────────────────────────────────────────────────────────────

/**
 * Creates a wrapper that provides EditorContext in uncontrolled mode.
 * Falls back to createEmptyState() when no initialState is provided.
 */
export function makeWrapper(initialState?: EditorState) {
    const Wrapper = ({ children }: WrapperProps) => (
        <EditorProvider defaultValue={initialState ?? createEmptyState()}>
            {children}
        </EditorProvider>
    );
    Object.defineProperty(Wrapper, 'displayName', { value: 'TestEditorWrapper' });
    return Wrapper;
}

// ─── makeControlledWrapper ────────────────────────────────────────────────────

/**
 * Creates a wrapper that provides EditorContext in controlled mode.
 *
 * Returns:
 * - Wrapper: the provider component
 * - onChange: a vi.fn() spy — use onChange.mock.calls[0][0] to inspect
 *   the EditorState passed to it
 * - getSetState: returns the internal setState so tests can drive
 *   state changes externally
 */
export function makeControlledWrapper(initialState?: EditorState) {
    const onChange = vi.fn<(state: EditorState) => void>();
    let externalSetState: React.Dispatch<React.SetStateAction<EditorState>>;

    const Wrapper = ({ children }: WrapperProps) => {
        const [state, setState] = React.useState<EditorState>(
            initialState ?? createEmptyState(),
        );

        externalSetState = setState;

        const handleChange = React.useCallback((newState: EditorState): void => {
            setState(newState);
            onChange(newState);
        }, []);

        return (
            <EditorProvider value={state} onChange={handleChange}>
                {children}
            </EditorProvider>
        );
    };

    Object.defineProperty(Wrapper, 'displayName', { value: 'TestControlledEditorWrapper' });

    return {
        Wrapper,
        onChange,
        getSetState: () => externalSetState,
    };
}

// ─── renderWithEditor ─────────────────────────────────────────────────────────

/**
 * Convenience wrapper around render that always provides EditorContext.
 * Use when you don't need access to dispatch or onChange directly.
 *
 * @example
 * ```tsx
 * const { container } = renderWithEditor(<MyComponent />);
 * expect(container.querySelector('button')).toBeInTheDocument();
 * ```
 */
export function renderWithEditor(
    ui: React.ReactElement,
    initialState?: EditorState,
    options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
    return render(ui, {
        ...options,
        wrapper: makeWrapper(initialState),
    });
}

// ─── afterEach cleanup ─────────────────────────────────────────────────────────

afterEach(() => {
    cleanup();
});
