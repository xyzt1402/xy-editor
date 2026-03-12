/**
 * UncontrolledEditor - Editor wrapper with imperative handle.
 * @package @xy-editor/react
 * @module components/Editor/UncontrolledEditor
 */

import React, {
    forwardRef,
    useImperativeHandle,
    useRef,
    useCallback,
} from 'react';
import { Editor } from './Editor';
import type { EditorState, EditorNode } from '@xy-editor/core';
import { createEmptyState } from '@xy-editor/core';
import { marksToStyle } from './marksToStyle';

export interface EditorHandle {
    /** Get current editor state */
    getState(): EditorState;
    /** Replace entire editor state */
    setState(state: EditorState): void;
    /** Focus the editor */
    focus(): void;
    /** Blur (unfocus) the editor */
    blur(): void;
    /** Clear all content */
    clear(): void;
    /** Get HTML serialization of editor state (never reads DOM) */
    getHTML(): string;
    /** Get plain text from editor state (never reads DOM) */
    getText(): string;
}

export interface UncontrolledEditorProps {
    /** Initial editor state */
    defaultValue?: EditorState;
    /** Called whenever state changes */
    onChange?: (state: EditorState) => void;
    /** Show toolbar (boolean or custom toolbar node) */
    toolbar?: boolean | React.ReactNode;
    /** Enable drop zone for file ingestion */
    dropZone?: boolean;
    /** Placeholder text when editor is empty */
    placeholder?: string;
    /** Make editor read-only */
    readOnly?: boolean;
    /** Additional className */
    className?: string;
    /** Additional inline styles */
    style?: React.CSSProperties;
}

/**
 * Collects text from all text nodes in the tree.
 */
function collectText(node: EditorNode): string {
    if (node.type === 'text') {
        return node.text ?? '';
    }
    return (node.children ?? []).map(collectText).join('');
}

/**
 * Converts an EditorNode to HTML string.
 * This is a simple implementation that serializes the tree structure.
 */
function nodeToHtml(node: EditorNode): string {
    const children = (node.children ?? []).map(nodeToHtml).join('');

    switch (node.type) {
        case 'doc':
            return children;

        case 'paragraph':
            return `<p>${children}</p>`;

        case 'heading': {
            const level = (node.attrs?.level ?? 2) as number;
            const clampedLevel = Math.min(Math.max(level, 1), 6);
            return `<h${clampedLevel}>${children}</h${clampedLevel}>`;
        }

        case 'text': {
            const style = marksToStyle(node.marks ?? []);
            const styleStr = Object.entries(style)
                .map(([key, value]) => {
                    const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
                    return `${cssKey}: ${value};`;
                })
                .join(' ');
            const styleAttr = styleStr ? ` style="${styleStr}"` : '';
            const text = node.text ?? '';
            // Escape HTML entities
            const escaped = text
                .replace(/&/g, '&')
                .replace(/</g, '<')
                .replace(/>/g, '>');
            return `<span data-node-id="${node.id}"${styleAttr}>${escaped}</span>`;
        }

        case 'bulletList':
        case 'list':
            return `<ul>${children}</ul>`;

        case 'orderedList':
            return `<ol>${children}</ol>`;

        case 'listItem':
            return `<li>${children}</li>`;

        case 'blockquote':
            return `<blockquote>${children}</blockquote>`;

        case 'codeBlock':
            return `<pre><code>${children}</code></pre>`;

        case 'table': {
            const columns = (node.attrs?.columns ?? 1) as number;
            return `<div role="table" data-node-type="table" style="display: grid; grid-template-columns: repeat(${columns}, 1fr);">${children}</div>`;
        }

        case 'tableRow':
            return `<div role="row" data-node-type="table-row" style="display: contents;">${children}</div>`;

        case 'tableCell':
            return `<div role="cell" data-node-type="table-cell">${children}</div>`;

        case 'horizontalRule':
            return '<hr />';

        case 'hardBreak':
            return '<br />';

        default:
            return `<div data-node-id="${node.id}">${children}</div>`;
    }
}

/**
 * UncontrolledEditor - Editor with imperative handle.
 *
 * @example
 * ```tsx
 * const editorRef = useRef<EditorHandle>(null);
 *
 * <UncontrolledEditor ref={editorRef} />
 *
 * // Get current state
 * const state = editorRef.current?.getState();
 *
 * // Get HTML
 * const html = editorRef.current?.getHTML();
 *
 * // Get plain text
 * const text = editorRef.current?.getText();
 *
 * // Focus editor
 * editorRef.current?.focus();
 * ```
 */
export const UncontrolledEditor = forwardRef<EditorHandle, UncontrolledEditorProps>(
    function UncontrolledEditor(
        {
            defaultValue,
            onChange,
            toolbar,
            placeholder,
            readOnly,
            className,
            style,
        },
        ref
    ) {
        // Internal ref to track the current state
        const stateRef = useRef<EditorState>(defaultValue ?? createEmptyState());

        // Track onChange calls
        const handleChange = useCallback(
            (newState: EditorState) => {
                stateRef.current = newState;
                onChange?.(newState);
            },
            [onChange]
        );

        // Expose imperative handle
        useImperativeHandle(
            ref,
            (): EditorHandle => ({
                getState: (): EditorState => {
                    return stateRef.current;
                },

                setState: (newState: EditorState): void => {
                    stateRef.current = newState;
                    onChange?.(newState);
                },

                focus: (): void => {
                    // Focus would require the EditorContent to expose focus
                    // For now, we can't directly focus from here
                    console.warn('[UncontrolledEditor] focus() is not yet implemented');
                },

                blur: (): void => {
                    // Blur would require the EditorContent to expose blur
                    console.warn('[UncontrolledEditor] blur() is not yet implemented');
                },

                clear: (): void => {
                    stateRef.current = createEmptyState();
                    onChange?.(stateRef.current);
                },

                getHTML(): string {
                    return nodeToHtml(stateRef.current.doc);
                },

                getText(): string {
                    return collectText(stateRef.current.doc);
                },
            }),
            [onChange]
        );

        return (
            <Editor
                defaultValue={defaultValue}
                onChange={handleChange}
                toolbar={toolbar}
                placeholder={placeholder}
                readOnly={readOnly}
                className={className}
                style={style}
            />
        );
    }
);
