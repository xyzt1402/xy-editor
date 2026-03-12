/**
 * Tests for marksToStyle function.
 * @package @xy-editor/react
 * @module components/Editor/__tests__/marksToStyle.test
 */

import { describe, it, expect } from 'vitest';
import { marksToStyle } from '../marksToStyle';
import type { Mark } from '@xy-editor/core';

describe('marksToStyle', () => {
    it('empty array returns {}', () => {
        expect(marksToStyle([])).toEqual({});
    });

    it('bold → fontWeight 700', () => {
        const marks: Mark[] = [{ type: 'bold' }];
        expect(marksToStyle(marks)).toEqual({ fontWeight: '700' });
    });

    it('italic → fontStyle italic', () => {
        const marks: Mark[] = [{ type: 'italic' }];
        expect(marksToStyle(marks)).toEqual({ fontStyle: 'italic' });
    });

    it('underline → textDecoration underline', () => {
        const marks: Mark[] = [{ type: 'underline' }];
        expect(marksToStyle(marks)).toEqual({ textDecoration: 'underline' });
    });

    it('strikethrough → textDecoration line-through', () => {
        const marks: Mark[] = [{ type: 'strikethrough' }];
        expect(marksToStyle(marks)).toEqual({ textDecoration: 'line-through' });
    });

    it('underline + strikethrough → textDecoration "underline line-through"', () => {
        const marks: Mark[] = [
            { type: 'underline' },
            { type: 'strikethrough' },
        ];
        const result = marksToStyle(marks);
        expect(result.textDecoration).toBe('underline line-through');
    });

    it('code → fontFamily monospace + backgroundColor', () => {
        const marks: Mark[] = [{ type: 'code' }];
        const result = marksToStyle(marks);
        expect(result.fontFamily).toBe("'monospace', monospace");
        expect(result.backgroundColor).toBe('#f3f4f6');
        expect(result.borderRadius).toBe('3px');
        expect(result.padding).toBe('1px 4px');
    });

    it('color mark → color from attrs.color', () => {
        const marks: Mark[] = [{ type: 'color', attrs: { color: '#ff0000' } }];
        const result = marksToStyle(marks);
        expect(result.color).toBe('#ff0000');
    });

    it('highlight mark → backgroundColor from attrs.color', () => {
        const marks: Mark[] = [{ type: 'highlight', attrs: { color: '#ffff00' } }];
        const result = marksToStyle(marks);
        expect(result.backgroundColor).toBe('#ffff00');
    });

    it('fontFamily mark → fontFamily from attrs.value', () => {
        const marks: Mark[] = [{ type: 'fontFamily', attrs: { value: 'Arial' } }];
        const result = marksToStyle(marks);
        expect(result.fontFamily).toBe('Arial');
    });

    it('fontSize mark → fontSize as px string from attrs.value', () => {
        const marks: Mark[] = [{ type: 'fontSize', attrs: { value: 16 } }];
        const result = marksToStyle(marks);
        expect(result.fontSize).toBe('16px');
    });

    it('unknown mark type → ignored, no throw, no extra keys in result', () => {
        const marks: Mark[] = [
            { type: 'bold' },
            { type: 'unknown-mark-type' as Mark['type'] },
        ];
        const result = marksToStyle(marks);
        expect(result.fontWeight).toBe('700');
        // No additional keys from unknown mark
        expect(Object.keys(result).length).toBe(1);
    });

    it('bold + italic + color → all three properties present', () => {
        const marks: Mark[] = [
            { type: 'bold' },
            { type: 'italic' },
            { type: 'color', attrs: { color: '#0000ff' } },
        ];
        const result = marksToStyle(marks);
        expect(result.fontWeight).toBe('700');
        expect(result.fontStyle).toBe('italic');
        expect(result.color).toBe('#0000ff');
    });

    it('multiple color marks → last one wins', () => {
        const marks: Mark[] = [
            { type: 'color', attrs: { color: '#ff0000' } },
            { type: 'color', attrs: { color: '#00ff00' } },
        ];
        const result = marksToStyle(marks);
        expect(result.color).toBe('#00ff00');
    });
});
