/**
 * Renders editor nodes to JSX elements.
 * @package @xy-editor/react
 * @module components/Editor/renderNode
 */

import React from 'react';
import type { EditorNode } from '@xy-editor/core';
import { marksToStyle } from './marksToStyle';

/**
 * Renders an EditorNode to a JSX element.
 *
 * @param node - The editor node to render
 * @param key - React key for the element
 * @returns JSX.Element
 *
 * @example
 * renderNode(state.doc, state.doc.id)
 */
export function renderNode(node: EditorNode, key: string): React.ReactElement {
    const nodeId = node.id;
    const children = (node.children ?? []).map((child) =>
        renderNode(child, child.id)
    );

    // Common props for all elements
    const baseProps = {
        'data-node-id': nodeId,
        key,
    };

    switch (node.type) {
        case 'doc':
            return (
                <div {...baseProps} data-editor-root="true">
                    {children}
                </div>
            );

        case 'paragraph':
            return (
                <p
                    {...baseProps}
                    style={{
                        textAlign: node.attrs?.alignment as React.CSSProperties['textAlign'],
                    }}
                >
                    {children}
                </p>
            );

        case 'heading': {
            const level = (node.attrs?.level ?? 2) as number;
            const clampedLevel = Math.min(Math.max(level, 1), 6);
            const HeadingTag = `h${clampedLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            return (
                <HeadingTag {...baseProps}>{children}</HeadingTag>
            );
        }

        case 'text': {
            const style = marksToStyle(node.marks ?? []);
            // Handle empty text node - render <br> so caret has somewhere to land
            if (!node.text || node.text === '') {
                return (
                    <span {...baseProps} style={style}>
                        <br />
                    </span>
                );
            }
            return (
                <span {...baseProps} style={style}>
                    {node.text}
                </span>
            );
        }

        case 'bulletList':
        case 'list':
            return (
                <ul {...baseProps}>
                    {children}
                </ul>
            );

        case 'orderedList':
            return (
                <ol {...baseProps}>
                    {children}
                </ol>
            );

        case 'listItem':
            return (
                <li {...baseProps}>
                    {children}
                </li>
            );

        case 'blockquote':
            return (
                <blockquote {...baseProps}>
                    {children}
                </blockquote>
            );

        case 'codeBlock':
            return (
                <pre {...baseProps}>
                    <code {...baseProps}>{children}</code>
                </pre>
            );

        case 'table': {
            const columns = node.attrs?.columns ?? 1;
            return (
                <div
                    {...baseProps}
                    role="table"
                    data-node-type="table"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    }}
                >
                    {children}
                </div>
            );
        }

        case 'tableRow':
            return (
                <div
                    {...baseProps}
                    role="row"
                    data-node-type="table-row"
                    style={{ display: 'contents' }}
                >
                    {children}
                </div>
            );

        case 'tableCell':
            return (
                <div
                    {...baseProps}
                    role="cell"
                    data-node-type="table-cell"
                >
                    {children}
                </div>
            );

        case 'horizontalRule':
            return (
                <hr {...baseProps} />
            );

        case 'hardBreak':
            return <br {...baseProps} />;

        default:
            // Unknown node type - warn in dev only
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`Unknown node type: "${node.type}"`);
            }
            return (
                <div {...baseProps}>
                    {children}
                </div>
            );
    }
}
