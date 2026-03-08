/**
 * PDF parser using pdfjs-dist.
 * @package @xy-editor/file-ingestion
 * @module parsers/pdf
 */

import type { Parser, RawContent, RawBlock, FileMeta } from '../types';

// pdfjs-dist types - will be available when dependency is installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const pdfjsLib: any;

/**
 * Extract text items from a PDF page.
 */
async function extractPageText(
    page: {
        getTextContent: () => Promise<{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: any[];
        }>;
    }
): Promise<RawBlock[]> {
    const textContent = await page.getTextContent();
    const items = textContent.items;

    if (!items || items.length === 0) {
        return [];
    }

    // Group items by Y position (lines)
    const lines: { text: string; y: number }[] = [];
    let currentLine = '';
    let currentY: number | null = null;

    for (const item of items) {
        if (item.str) {
            const itemY = item.transform?.[5] ?? 0; // Y position from transform matrix

            if (currentY === null) {
                currentY = itemY;
                currentLine = item.str;
            } else if (Math.abs(itemY - currentY) < 5) {
                // Same line, append with space
                currentLine += ' ' + item.str;
            } else {
                // New line
                if (currentLine.trim()) {
                    lines.push({ text: currentLine.trim(), y: currentY });
                }
                currentY = itemY;
                currentLine = item.str;
            }
        }
    }

    // Add the last line
    if (currentLine.trim() && currentY !== null) {
        lines.push({ text: currentLine.trim(), y: currentY });
    }

    // Convert lines to blocks using heuristics
    const blocks: RawBlock[] = [];
    let lastY: number | null = null;

    for (const line of lines) {
        // Large Y gap = paragraph break (lines go from top to bottom, so larger Y = new paragraph below)
        const yGap = lastY !== null ? lastY - line.y : 0;
        const isParagraphBreak = yGap > 20; // Threshold for paragraph break

        // Check for heading: all-caps short lines
        const isHeading = line.text.length < 100 &&
            line.text === line.text.toUpperCase() &&
            /[A-Z]/.test(line.text);

        if (isParagraphBreak || blocks.length === 0) {
            // Start a new block
            if (isHeading) {
                // Estimate heading level based on text length
                const level = line.text.length < 20 ? 1 : line.text.length < 40 ? 2 : 3;
                blocks.push({
                    type: 'heading',
                    level,
                    text: line.text,
                });
            } else {
                blocks.push({
                    type: 'paragraph',
                    text: line.text,
                });
            }
        } else {
            // Append to previous block
            const lastBlock = blocks[blocks.length - 1];
            if (!lastBlock) continue;

            if (lastBlock.type === 'paragraph') {
                lastBlock.text += '\n' + line.text;
            } else if (lastBlock.type === 'heading') {
                // If it's a heading and we have more text, convert to paragraph
                lastBlock.type = 'paragraph';
                lastBlock.text += '\n' + line.text;
                delete lastBlock.level;
            }
        }

        lastY = line.y;
    }

    return blocks;
}

/**
 * PDF Parser implementation.
 * Extracts text from PDF files using pdfjs-dist.
 */
export class PdfParser implements Parser {
    mimeTypes = ['application/pdf'];
    extensions = ['pdf'];

    /**
     * Parses a PDF file and returns raw content.
     * @param file - The PDF file to parse
     * @returns Promise resolving to raw content
     */
    async parse(file: File): Promise<RawContent> {
        const arrayBuffer = await file.arrayBuffer();

        // Dynamically import pdfjs-dist
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url
        ).toString();

        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        const allBlocks: RawBlock[] = [];

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const pageBlocks = await extractPageText(page);

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

        const meta: FileMeta = {
            filename: file.name,
            mimeType: file.type || 'application/pdf',
            size: file.size,
            lastModified: file.lastModified,
            extension: 'pdf',
        };

        return {
            blocks: allBlocks,
            meta,
        };
    }
}

// Export singleton instance for convenience
export const pdfParser = new PdfParser();
