/**
 * EditorContent - Core contenteditable rendering component.
 * @package @xy-editor/react
 * @module components/Editor/EditorContent
 */

import React, {
    useRef,
    useEffect,
    useCallback,
} from 'react';
import { useEditorContext } from '../../context/EditorContext';
import { useEditor } from '../../hooks/useEditor';
import { renderNode } from './renderNode';
import { generateId } from '@xy-editor/core';
import { useFileIngest } from '../../hooks/useFileIngest';

export interface EditorContentProps {
    className?: string;
    placeholder?: string;
    readOnly?: boolean;
    autoFocus?: boolean;
}

/**
 * Debounce function with default 16ms delay.
 */
function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return ((...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    }) as T;
}

/**
 * Converts a DOM point to an editor point.
 * Walks up the DOM from node until finding an element with data-node-id.
 */
function domPointToEditorPoint(
    node: Node | null,
    offset: number
): { nodeId: string; offset: number } | null {
    if (!node) return null;

    let current: Node | null = node;
    while (current) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            const element = current as Element;
            const nodeId = element.getAttribute('data-node-id');
            if (nodeId) {
                return { nodeId, offset };
            }
        }
        current = current.parentNode;
    }
    return null;
}

/**
 * EditorContent - The dumb renderer that reads from context only.
 * Handles all event listeners and selection synchronization.
 */
export function EditorContent({
    className,
    placeholder,
    readOnly = false,
    autoFocus = false,
}: EditorContentProps): React.ReactElement {
    const rootRef = useRef<HTMLDivElement>(null);
    const { state, dispatch, setState } = useEditorContext();
    const { commands } = useEditor();
    const { ingest } = useFileIngest();

    // Ref to track state for event handlers
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // ── Selection handling ─────────────────────────────────────────────────────

    const handleSelectionChange = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || !rootRef.current?.contains(sel.anchorNode)) return;

        const anchor = domPointToEditorPoint(sel.anchorNode, sel.anchorOffset);
        const focus = domPointToEditorPoint(sel.focusNode, sel.focusOffset);
        if (!anchor || !focus) return;

        setState({
            ...stateRef.current,
            selection: {
                anchor,
                focus,
                isCollapsed: sel.isCollapsed,
            },
        });
    }, [setState]);

    // Debounced selection change handler
    const debouncedSelectionChange = useCallback(
        debounce(handleSelectionChange, 16),
        [handleSelectionChange]
    );

    // ── BeforeInput handling ───────────────────────────────────────────────────

    const handleBeforeInput = useCallback(
        (event: InputEvent) => {
            const inputType = event.inputType;

            switch (inputType) {
                case 'insertText':
                    event.preventDefault();
                    commands.insertText(event.data ?? '');
                    break;

                case 'deleteContentBackward':
                    event.preventDefault();
                    dispatch({
                        id: generateId(),
                        steps: [{
                            type: 'deleteText',
                            data: { direction: 'backward' },
                            position: stateRef.current.selection
                                ? {
                                    anchor: stateRef.current.selection.anchor,
                                    focus: stateRef.current.selection.focus,
                                }
                                : undefined,
                        }],
                    });
                    break;

                case 'deleteContentForward':
                    event.preventDefault();
                    dispatch({
                        id: generateId(),
                        steps: [{
                            type: 'deleteText',
                            data: { direction: 'forward' },
                            position: stateRef.current.selection
                                ? {
                                    anchor: stateRef.current.selection.anchor,
                                    focus: stateRef.current.selection.focus,
                                }
                                : undefined,
                        }],
                    });
                    break;

                case 'insertParagraph':
                    event.preventDefault();
                    dispatch({
                        id: generateId(),
                        steps: [{
                            type: 'splitNode',
                            position: stateRef.current.selection
                                ? {
                                    anchor: stateRef.current.selection.anchor,
                                    focus: stateRef.current.selection.focus,
                                }
                                : undefined,
                        }],
                    });
                    break;

                case 'insertLineBreak':
                    event.preventDefault();
                    commands.insertText('\n');
                    break;

                case 'historyUndo':
                    event.preventDefault();
                    commands.undo();
                    break;

                case 'historyRedo':
                    event.preventDefault();
                    commands.redo();
                    break;

                default:
                    // Not handled - let browser do default
                    break;
            }
        },
        [commands, dispatch]
    );

    // ── Keydown handling ───────────────────────────────────────────────────────

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            // Default shortcuts
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modKey = isMac ? event.metaKey : event.ctrlKey;

            if (modKey) {
                switch (event.key) {
                    case 'z':
                        if (event.shiftKey) {
                            event.preventDefault();
                            commands.redo();
                        } else {
                            event.preventDefault();
                            commands.undo();
                        }
                        break;
                    case 'y':
                        event.preventDefault();
                        commands.redo();
                        break;
                    case 'b':
                        event.preventDefault();
                        commands.bold();
                        break;
                    case 'i':
                        event.preventDefault();
                        commands.italic();
                        break;
                    case 'u':
                        event.preventDefault();
                        commands.underline();
                        break;
                }
            }
        },
        [commands]
    );

    // ── Paste handling ───────────────────────────────────────────────────────

    const handlePaste = useCallback(
        (event: React.ClipboardEvent) => {
            event.preventDefault();

            const html = event.clipboardData.getData('text/html');
            const plain = event.clipboardData.getData('text/plain');

            if (html) {
                // Strip disallowed tags - allowlist approach
                const allowedTags = [
                    'b', 'i', 'u', 's', 'em', 'strong', 'p', 'br',
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'span',
                ];

                // Simple HTML parsing - remove disallowed elements
                let cleanedHtml = html;
                const tagRegex = /<(\/?)([\w]+)[^>]*>/g;
                cleanedHtml = html.replace(tagRegex, (match, _closing, tag) => {
                    const lowerTag = tag.toLowerCase();
                    if (allowedTags.includes(lowerTag)) {
                        return match;
                    }
                    return '';
                });

                if (cleanedHtml.trim()) {
                    // Convert to plain text - HTML to Transaction conversion
                    // would require additional parsing infrastructure
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = cleanedHtml;
                    const textContent = tempDiv.textContent || tempDiv.innerText || '';
                    if (textContent) {
                        commands.insertText(textContent);
                        return;
                    }
                }
            }

            // Fall back to plain text
            if (plain) {
                commands.insertText(plain);
            }
        },
        [commands]
    );

    // ── Drop handling ─────────────────────────────────────────────────────────

    const handleDrop = useCallback(
        async (event: React.DragEvent) => {
            event.preventDefault();

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                try {
                    const file = files[0];
                    if (file) {
                        await ingest(file);
                    }
                } catch {
                    // File ingestion failed, try as text
                    const text = event.dataTransfer.getData('text/plain');
                    if (text) {
                        commands.insertText(text);
                    }
                }
            } else {
                const text = event.dataTransfer.getData('text/plain');
                if (text) {
                    commands.insertText(text);
                }
            }
        },
        [commands, ingest]
    );

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
    }, []);

    // ── AutoFocus ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (autoFocus && rootRef.current) {
            rootRef.current.focus();
        }
    }, [autoFocus]);

    // ── Event listener cleanup ───────────────────────────────────────────────

    useEffect(() => {
        // Register document listeners
        document.addEventListener('selectionchange', debouncedSelectionChange);
        document.addEventListener('beforeinput', handleBeforeInput);

        return () => {
            document.removeEventListener('selectionchange', debouncedSelectionChange);
            document.removeEventListener('beforeinput', handleBeforeInput);
        };
    }, [debouncedSelectionChange, handleBeforeInput]);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div
            ref={rootRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-editor-root="true"
            data-placeholder={placeholder}
            className={className}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
                outline: 'none',
                minHeight: '100px',
            }}
        >
            {renderNode(state.doc, state.doc.id)}
        </div>
    );
}
