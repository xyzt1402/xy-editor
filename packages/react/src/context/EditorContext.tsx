/**
 * Editor Context — React context for editor state management.
 * @package @xy-editor/react
 * @module context/EditorContext
 */

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    useMemo,
    type ReactNode,
    type JSX,
} from 'react';
import { applyTransaction, createEmptyState } from '@xy-editor/core';
import type { EditorState, Transaction, EditorPlugin } from '@xy-editor/core';

// ─── Context Value ────────────────────────────────────────────────────────────

/**
 * The value provided by EditorContext.
 *
 * Intentionally minimal — only the primitives that every consumer needs.
 * Commands and editor helpers live in useEditor, not here.
 *
 * dispatch  — for incremental changes via transactions (typing, formatting)
 * setState  — for wholesale state replacement (undo/redo, file ingestion)
 */
export interface EditorContextValue {
    state: EditorState;
    dispatch: (tr: Transaction) => void;
    setState: (state: EditorState) => void;
    isControlled: boolean;
}

// ─── Provider Props ───────────────────────────────────────────────────────────

export interface EditorProviderProps {
    children: ReactNode;
    /**
     * Controlled mode — consumer owns the state.
     * Must be paired with onChange, otherwise transactions are silently dropped.
     */
    value?: EditorState;
    /**
     * Uncontrolled mode — editor owns the state internally.
     * Falls back to createEmptyState() if not provided.
     */
    defaultValue?: EditorState;
    /** Called whenever state changes, in both controlled and uncontrolled mode */
    onChange?: (state: EditorState) => void;
    /** Plugins to register on mount */
    plugins?: EditorPlugin[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const EditorContext = createContext<EditorContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provides editor state and dispatch to the component tree.
 *
 * Supports both controlled and uncontrolled usage:
 *
 * @example Uncontrolled
 * ```tsx
 * <EditorProvider>
 *   <EditorContent />
 * </EditorProvider>
 * ```
 *
 * @example Controlled
 * ```tsx
 * <EditorProvider value={state} onChange={setState}>
 *   <EditorContent />
 * </EditorProvider>
 * ```
 */
export function EditorProvider({
    children,
    value,
    defaultValue,
    onChange,
    plugins = [],
}: EditorProviderProps): JSX.Element {

    // ── Controlled / uncontrolled mode ────────────────────────────────────────
    // Lock in the mode on mount. Switching mid-lifecycle is undefined behaviour
    // (same as React's own controlled/uncontrolled input warning).
    const isControlledRef = useRef(value !== undefined);
    const isControlled = isControlledRef.current;

    // Warn in dev if the consumer switches modes after mount
    useEffect(() => {
        if ((value !== undefined) !== isControlled) {
            console.warn(
                '[EditorProvider] Cannot switch between controlled and uncontrolled mode ' +
                'after mount. Decide on one pattern and stick with it.'
            );
        }
    });

    // Warn in dev if controlled mode is used without onChange
    useEffect(() => {
        if (isControlled && !onChange) {
            console.warn(
                '[EditorProvider] Controlled mode requires an onChange prop. ' +
                'Transactions will have no effect without it.'
            );
        }
    }, [isControlled, onChange]);

    // ── Internal state (uncontrolled mode) ───────────────────────────────────
    // Initialiser function ensures createEmptyState() is only called once,
    // not on every render.
    const [uncontrolledState, setUncontrolledState] = useState<EditorState>(
        () => defaultValue ?? createEmptyState()
    );

    const currentState = isControlled ? (value as EditorState) : uncontrolledState;

    // ── State ref ─────────────────────────────────────────────────────────────
    // dispatch and setState read from stateRef rather than closing over
    // currentState — this keeps their references stable across renders.
    const stateRef = useRef(currentState);
    useEffect(() => {
        stateRef.current = currentState;
    }, [currentState]);

    // ── dispatch ──────────────────────────────────────────────────────────────
    // For incremental changes: applies a Transaction via applyTransaction.
    // Stable reference — does not recreate on every state change.
    const dispatch = useCallback((tr: Transaction): void => {
        const newState = applyTransaction(stateRef.current, tr);

        if (isControlled) {
            // In controlled mode, hand the new state to the consumer.
            // They are responsible for feeding it back via the value prop.
            onChange?.(newState);
        } else {
            setUncontrolledState(newState);
            onChange?.(newState);
        }
    }, [isControlled, onChange]);

    // ── setState ──────────────────────────────────────────────────────────────
    // For wholesale replacement: bypasses applyTransaction entirely.
    // Used by undo/redo and file ingestion which produce complete EditorState
    // snapshots rather than incremental transactions.
    const setState = useCallback((newState: EditorState): void => {
        if (isControlled) {
            onChange?.(newState);
        } else {
            setUncontrolledState(newState);
            onChange?.(newState);
        }
    }, [isControlled, onChange]);

    // ── Plugin registration ───────────────────────────────────────────────────
    // Plugins are registered on mount and unregistered on unmount.
    // Re-runs only if the plugins array reference changes.
    useEffect(() => {
        if (plugins.length === 0) return;

        // TODO: integrate with PluginRegistry from @xy-editor/core
        // const registry = new PluginRegistry();
        // Promise.all(plugins.map(p => registry.register(p)));
        // return () => { registry.clear(); };

        console.warn(
            '[EditorProvider] Plugin registration is not yet implemented. ' +
            `${plugins.length} plugin(s) were passed but not registered.`
        );
    }, [plugins]);

    // ── Context value ─────────────────────────────────────────────────────────
    const contextValue = useMemo<EditorContextValue>(
        () => ({ state: currentState, dispatch, setState, isControlled }),
        [currentState, dispatch, setState, isControlled],
    );

    return (
        <EditorContext.Provider value={contextValue}>
            {children}
        </EditorContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the EditorContext value.
 * Must be used within an EditorProvider.
 *
 * @throws If used outside of EditorProvider
 */
export function useEditorContext(): EditorContextValue {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error(
            '[useEditorContext] Must be used within an <EditorProvider>. ' +
            'Wrap your editor components in <EditorProvider>.'
        );
    }
    return context;
}