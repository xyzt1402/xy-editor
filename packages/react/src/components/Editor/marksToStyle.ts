/**
 * Converts editor marks to CSS properties.
 * @package @xy-editor/react
 * @module components/Editor/marksToStyle
 */

import type { Mark } from '@xy-editor/core';

/**
 * Converts an array of marks to CSS properties.
 *
 * @param marks - Array of marks to convert
 * @returns React CSSProperties object
 *
 * @example
 * marksToStyle([{ type: 'bold' }, { type: 'italic' }])
 * // Returns: { fontWeight: '700', fontStyle: 'italic' }
 */
export function marksToStyle(marks: Mark[]): React.CSSProperties {
    if (!marks || marks.length === 0) {
        return {};
    }

    const style: React.CSSProperties = {};
    const textDecorations: string[] = [];

    for (const mark of marks) {
        switch (mark.type) {
            case 'bold':
                style.fontWeight = '700';
                break;

            case 'italic':
                style.fontStyle = 'italic';
                break;

            case 'underline':
                textDecorations.push('underline');
                break;

            case 'strikethrough':
                textDecorations.push('line-through');
                break;

            case 'code':
                style.fontFamily = "'monospace', monospace";
                style.backgroundColor = '#f3f4f6';
                style.borderRadius = '3px';
                style.padding = '1px 4px';
                break;

            case 'color':
                if (mark.attrs?.color && typeof mark.attrs.color === 'string') {
                    style.color = mark.attrs.color;
                }
                break;

            case 'highlight':
                if (mark.attrs?.color && typeof mark.attrs.color === 'string') {
                    style.backgroundColor = mark.attrs.color;
                }
                break;

            case 'fontFamily':
                if (mark.attrs?.value && typeof mark.attrs.value === 'string') {
                    style.fontFamily = mark.attrs.value;
                }
                break;

            case 'fontSize':
                if (mark.attrs?.value && typeof mark.attrs.value === 'number') {
                    style.fontSize = `${mark.attrs.value}px`;
                }
                break;

            default:
                // Unknown mark types are ignored silently
                break;
        }
    }

    // Merge text decorations
    if (textDecorations.length > 0) {
        style.textDecoration = textDecorations.join(' ');
    }

    return style;
}
