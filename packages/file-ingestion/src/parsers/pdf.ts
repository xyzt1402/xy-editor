/**
 * PDF parser using pdfjs-dist (lazy loaded).
 * @package @xy-editor/file-ingestion
 * @module parsers/pdf
 */

import type { Parser, RawContent, RawBlock } from '../types';
import { buildFileMeta, validateFile } from '../utils';

export class PdfParser implements Parser {
    mimeTypes = ['application/pdf'];
    extensions = ['pdf'];

    async parse(file: File): Promise<RawContent> {
        validateFile(file);

        const arrayBuffer = await file.arrayBuffer();

        // Lazy load pdfjs-dist — ~1.5MB, only loaded when a PDF is opened
        const pdfjs = await import('pdfjs-dist');

        // Required: point the worker at the correct URL for your bundler setup
        // This should be configured at app level; we set a safe default here.
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.min.mjs',
                import.meta.url,
            ).toString();
        }

        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const blocks: RawBlock[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Group text items into lines based on Y position
            const lines = groupIntoLines(
                textContent.items as PdfjsTextItem[]
            );

            for (const line of lines) {
                const text = line.text.trim();
                if (!text) continue;

                const block = classifyLine(line);
                blocks.push(block);
            }

            // Add a paragraph break between pages (except after last page)
            if (pageNum < pdf.numPages) {
                blocks.push({ type: 'hr', text: '' });
            }
        }

        return {
            blocks,
            meta: buildFileMeta(file, 'application/pdf'),
        };
    }
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface PdfjsTextItem {
    str: string;
    transform: number[];   // [scaleX, skewX, skewY, scaleY, x, y]
    height: number;
    width: number;
    fontName?: string;
}

interface LineGroup {
    text: string;
    y: number;
    height: number;
    items: PdfjsTextItem[];
}

// ─── Line Grouping ────────────────────────────────────────────────────────────

const Y_TOLERANCE = 2; // px — items within this Y range are on the same line

function groupIntoLines(items: PdfjsTextItem[]): LineGroup[] {
    const lines: LineGroup[] = [];

    for (const item of items) {
        if (!item.str.trim()) continue;

        const y = item.transform[5] ?? 0;
        const existing = lines.find(l => Math.abs(l.y - y) <= Y_TOLERANCE);

        if (existing) {
            existing.text += item.str;
            existing.items.push(item);
        } else {
            lines.push({ text: item.str, y, height: item.height, items: [item] });
        }
    }

    // Sort top-to-bottom (PDF y-axis is inverted)
    return lines.sort((a, b) => b.y - a.y);
}

// ─── Line Classification ──────────────────────────────────────────────────────

const HEADING_MIN_HEIGHT = 14; // px — larger text is likely a heading

function classifyLine(line: LineGroup): RawBlock {
    const text = line.text.trim();
    const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
    const isShort = text.length < 80;
    const isLarge = line.height >= HEADING_MIN_HEIGHT;

    if (isLarge && isShort) {
        // Estimate heading level from font size
        const level = line.height >= 24 ? 1
            : line.height >= 20 ? 2
                : line.height >= 17 ? 3
                    : 4;
        return { type: 'heading', level, text };
    }

    if (isAllCaps && isShort && line.height >= 11) {
        return { type: 'heading', level: 2, text };
    }

    return { type: 'paragraph', text };
}

export const pdfParser = new PdfParser();