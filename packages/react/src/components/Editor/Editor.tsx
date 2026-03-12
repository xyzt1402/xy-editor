/**
 * Editor - Composition root for the editor component.
 * Handles controlled/uncontrolled modes.
 * @package @xy-editor/react
 * @module components/Editor/Editor
 */

import React, { useEffect } from 'react';
import { EditorProvider } from '../../context/EditorContext';
import { EditorContent } from './EditorContent';
import { Toolbar } from '../Toolbar';
import type { EditorState, EditorPlugin } from '@xy-editor/core';
import { createEmptyState } from '@xy-editor/core';

export interface EditorProps {
    /** Controlled mode - editor state is owned by parent */
    value?: EditorState;
    /** Uncontrolled mode - editor owns its own state */
    defaultValue?: EditorState;
    /** Called whenever state changes (controlled mode requires this) */
    onChange?: (state: EditorState) => void;
    /** Plugins to register */
    plugins?: EditorPlugin[];
    /** Show toolbar (boolean or custom toolbar node) */
    toolbar?: boolean | React.ReactNode;
    /** Enable drop zone for file ingestion */
    dropZone?: boolean;
    /** Placeholder text when editor is empty */
    placeholder?: string;
    /** Make editor read-only */
    readOnly?: boolean;
    /** Focus the editor on mount */
    autoFocus?: boolean;
    /** Additional className */
    className?: string;
    /** Additional inline styles */
    style?: React.CSSProperties;
}

/**
 * Editor - The main composition root.
 *
 * Supports both controlled and uncontrolled modes:
 *
 * @example Controlled
 * ```tsx
 * const [state, setState] = useState(createEmptyState());
 * <Editor
 *   value={state}
 *   onChange={setState}
 * />
 * ```
 *
 * @example Uncontrolled
 * ```tsx
 * <Editor
 *   defaultValue={initialState}
 *   onChange={(state) => console.log(state)}
 * />
 * ```
 */
export function Editor({
    value,
    defaultValue,
    onChange,
    plugins = [],
    toolbar = true,
    placeholder,
    readOnly,
    autoFocus,
    className,
    style,
}: EditorProps): React.ReactElement {
    const isControlled = value !== undefined;
    const hasDefaultValue = defaultValue !== undefined;

    // Warn in dev if both value and defaultValue are provided
    useEffect(() => {
        if (isControlled && hasDefaultValue) {
            console.warn(
                '[Editor] Both value and defaultValue are provided. ' +
                'Treating as controlled mode. Use either value (controlled) ' +
                'or defaultValue (uncontrolled), not both.'
            );
        }
    }, [isControlled, hasDefaultValue]);

    // Resolve initial state
    const initialState = isControlled
        ? value
        : hasDefaultValue
            ? defaultValue
            : createEmptyState();

    return (
        <EditorProvider
            value={isControlled ? value : undefined}
            defaultValue={initialState}
            onChange={onChange}
            plugins={plugins}
        >
            <div
                className={`xy-editor ${className ?? ''}`}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    ...style,
                }}
            >
                {toolbar !== false && (
                    <>
                        {typeof toolbar === 'object' ? (
                            toolbar
                        ) : (
                            <Toolbar />
                        )}
                    </>
                )}
                <EditorContent
                    placeholder={placeholder}
                    readOnly={readOnly}
                    autoFocus={autoFocus}
                />
            </div>
        </EditorProvider>
    );
}
