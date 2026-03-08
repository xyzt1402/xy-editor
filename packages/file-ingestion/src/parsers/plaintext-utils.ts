/**
 * Shared plain-text-to-blocks logic.
 * Extracted so both PlainTextParser and RtfParser can use it
 * without creating a circular dependency.
 *
 * @package @xy-editor/file-ingestion
 * @module parsers/plaintext-utils
 */

import type { RawBlock } from '../types';

const LIST_MARKERS = /^(\s*[-*•]\s+|\s*\d+[.)]\s+)/;

function isListLine(line: string): boolean {
    return LIST_MARKERS.test(line);
}

function stripListMarker(line: string): string {
    return line.replace(LIST_MARKERS, '').trim();
}

function detectHeading(line: string): RawBlock | null {
    const isShort = line.length <= 80;
    const isAllCaps = line === line.toUpperCase() && /[A-Z]{2,}/.test(line);
    const endsWithColon = line.endsWith(':');
    if (!isShort) return null;
    if (isAllCaps) return { type: 'heading', level: 2, text: line };
    if (endsWithColon) return { type: 'heading', level: 3, text: line };
    return null;
}

export function parsePlainText(text: string): RawBlock[] {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const paragraphGroups = normalized.split(/\n{2,}/);
    const blocks: RawBlock[] = [];

    for (const group of paragraphGroups) {
        const trimmed = group.trim();
        if (!trimmed) continue;

        const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);

        if (lines.every(isListLine)) {
            for (const line of lines) {
                blocks.push({ type: 'list-item', text: stripListMarker(line) });
            }
            continue;
        }

        if (lines.length === 1) {
            const heading = detectHeading(lines[0]!);
            if (heading) {
                blocks.push(heading);
                continue;
            }
        }

        blocks.push({ type: 'paragraph', text: lines.join(' ') });
    }

    return blocks;
}