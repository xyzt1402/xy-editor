/**
 * CSV parser.
 * @package @xy-editor/file-ingestion
 * @module parsers/csv
 */

import type { Parser, RawContent, RawBlock, FileMeta } from '../types';

/**
 * Simple CSV parser that handles quoted fields and commas.
 */
function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                // End of quoted field
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                // Start of quoted field
                inQuotes = true;
            } else if (char === ',') {
                // End of field
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                // End of row
                currentRow.push(currentField.trim());
                if (currentRow.some(f => f)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
                if (char === '\r') i++; // Skip \n
            } else if (char !== '\r') {
                currentField += char;
            }
        }
    }

    // Add last field and row
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f)) {
        rows.push(currentRow);
    }

    return rows;
}

/**
 * CSV Parser implementation.
 * Converts CSV rows into table RawBlocks.
 */
export class CsvParser implements Parser {
    mimeTypes = ['text/csv', 'application/csv'];
    extensions = ['csv', 'tsv'];

    /**
     * Parses a CSV file and returns raw content.
     * @param file - The CSV file to parse
     * @returns Promise resolving to raw content
     */
    async parse(file: File): Promise<RawContent> {
        const text = await file.text();

        const rows = parseCSV(text);
        const blocks: RawBlock[] = [];

        if (rows.length === 0) {
            const meta: FileMeta = {
                filename: file.name,
                mimeType: file.type || 'text/csv',
                size: file.size,
                lastModified: file.lastModified,
                extension: 'csv',
            };

            return { blocks: [], meta };
        }

        // First row is header
        const headerRow = rows[0];

        // Create a heading from the header
        if (headerRow && headerRow.length > 0) {
            blocks.push({
                type: 'heading',
                level: 1,
                text: headerRow.join(' | '),
                data: { isHeader: true },
            });
        }

        // Process remaining rows as table rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // Pad row to match header length
            while (headerRow && row.length < headerRow.length) {
                row.push('');
            }

            blocks.push({
                type: 'table-row',
                text: row.join(' | '),
                data: { cells: row },
            });
        }

        const meta: FileMeta = {
            filename: file.name,
            mimeType: file.type || 'text/csv',
            size: file.size,
            lastModified: file.lastModified,
            extension: 'csv',
        };

        return {
            blocks,
            meta,
        };
    }
}

// Export singleton instance for convenience
export const csvParser = new CsvParser();
