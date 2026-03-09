/**
 * Shared test utilities for @xy-editor/react hook tests.
 * @package @xy-editor/react
 * @module test/utils
 */

import React from 'react';
import { renderHook, type RenderHookOptions } from '@testing-library/react';
import { EditorProvider } from '../../context/EditorContext';
import { createEmptyState } from '@xy-editor/core';
import type { EditorState } from '@xy-editor/core';
import { vi } from 'vitest';

// ─── Types ────────────────────────────────────────────────────────────────────

type WrapperProps = { children: React.ReactNode };

// Derived directly from RenderHookOptions — stays in sync automatically
// if @testing-library/react updates its wrapper type.
type WrapperType = Required<RenderHookOptions<WrapperProps>>['wrapper'];

// ─── makeWrapper ──────────────────────────────────────────────────────────────

/**
 * Creates a wrapper that provides EditorContext in uncontrolled mode.
 * Falls back to createEmptyState() when no initialState is provided.
 *
 * Object.defineProperty is used for displayName instead of direct assignment —
 * direct assignment widens the inferred function type to an object type with
 * a displayName property, which breaks assignability to WrapperType.
 */
export function makeWrapper(initialState?: EditorState): WrapperType {
    const Wrapper = ({ children }: WrapperProps) => (
        <EditorProvider defaultValue={initialState ?? createEmptyState()}>
            {children}
        </EditorProvider>
    );
    Object.defineProperty(Wrapper, 'displayName', { value: 'TestEditorWrapper' });
    return Wrapper as WrapperType;
}

// ─── makeControlledWrapper ────────────────────────────────────────────────────

/**
 * Creates a wrapper that provides EditorContext in controlled mode.
 *
 * Returns:
 * - Wrapper: the provider component typed as WrapperType
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

    // Object.defineProperty avoids type widening — same reason as makeWrapper
    Object.defineProperty(Wrapper, 'displayName', { value: 'TestControlledEditorWrapper' });

    return {
        Wrapper: Wrapper as WrapperType,
        onChange,
        getSetState: () => externalSetState,
    };
}

// ─── makeWrapperWithOnChange ──────────────────────────────────────────────────

/**
 * Creates an uncontrolled wrapper that fires an onChange spy whenever state
 * changes. Useful for testing hooks that call setState (e.g. useFileIngest)
 * without needing full controlled mode.
 */
export function makeWrapperWithOnChange(initialState?: EditorState) {
    const onChange = vi.fn<(state: EditorState) => void>();

    const Wrapper = ({ children }: WrapperProps) => (
        <EditorProvider
            defaultValue={initialState ?? createEmptyState()}
            onChange={onChange}
        >
            {children}
        </EditorProvider>
    );
    Object.defineProperty(Wrapper, 'displayName', { value: 'TestOnChangeWrapper' });

    return {
        Wrapper: Wrapper as WrapperType,
        onChange,
    };
}

// ─── renderHookWithEditor ─────────────────────────────────────────────────────

/**
 * Convenience wrapper around renderHook that always provides EditorContext.
 * Use when you don't need access to dispatch or onChange directly.
 *
 * @example
 * ```tsx
 * const { result } = renderHookWithEditor(() => useEditorState());
 * expect(result.current.doc.type).toBe('doc');
 * ```
 */
export function renderHookWithEditor<T>(
    hook: () => T,
    initialState?: EditorState,
    options?: Omit<RenderHookOptions<WrapperProps>, 'wrapper'>,
) {
    return renderHook(hook, {
        ...options,
        wrapper: makeWrapper(initialState),
    });
}