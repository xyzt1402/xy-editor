/**
 * CSV / TSV parser.
 * @package @xy-editor/file-ingestion
 * @module parsers/csv
 */

import type { Parser, RawContent, RawBlock } from '../types';
import { buildFileMeta, validateFile } from '../utils';

export class CsvParser implements Parser {
    mimeTypes = [
        'text/csv',
        'text/tab-separated-values',
        'application/csv',
        'application/vnd.ms-excel', // some browsers report .csv with this MIME
    ];
    extensions = ['csv', 'tsv'];

    async parse(file: File): Promise<RawContent> {
        validateFile(file);

        const text = await file.text();
        const delimiter = file.name.endsWith('.tsv') || file.type === 'text/tab-separated-values'
            ? '\t'
            : detectDelimiter(text);

        const rows = parseDelimited(text, delimiter);
        const blocks: RawBlock[] = rows.map((cells, index) => ({
            type: 'table-row',
            text: cells.join('\t'),
            data: {
                cells,
                isHeader: index === 0,
                delimiter,
            },
        }));

        return {
            blocks,
            meta: buildFileMeta(file, 'text/csv'),
        };
    }
}

// ─── Delimiter Detection ──────────────────────────────────────────────────────

/**
 * Sniffs the most likely delimiter by counting occurrences in the first line.
 */
function detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0] ?? '';
    const candidates = [',', ';', '\t', '|'];
    let best = ',';
    let bestCount = 0;

    for (const c of candidates) {
        const count = firstLine.split(c).length - 1;
        if (count > bestCount) {
            bestCount = count;
            best = c;
        }
    }

    return best;
}

// ─── RFC 4180-compliant Parser ────────────────────────────────────────────────

/**
 * Parses delimited text respecting quoted fields and escaped quotes.
 * Handles: commas inside quotes, newlines inside quotes, "" as escaped quote.
 */
function parseDelimited(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const char = text[i]!;
        const next = text[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                // Escaped quote inside quoted field
                field += '"';
                i += 2;
                continue;
            }
            if (char === '"') {
                inQuotes = false;
                i++;
                continue;
            }
            field += char;
        } else {
            if (char === '"') {
                inQuotes = true;
                i++;
                continue;
            }
            if (char === delimiter) {
                row.push(field.trim());
                field = '';
                i++;
                continue;
            }
            if (char === '\r' && next === '\n') {
                row.push(field.trim());
                rows.push(row);
                row = [];
                field = '';
                i += 2;
                continue;
            }
            if (char === '\n') {
                row.push(field.trim());
                rows.push(row);
                row = [];
                field = '';
                i++;
                continue;
            }
            field += char;
        }
        i++;
    }

    // Push last field and row
    if (field || row.length > 0) {
        row.push(field.trim());
        rows.push(row);
    }

    // Filter out completely empty rows
    return rows.filter(r => r.some(cell => cell.length > 0));
}

export const csvParser = new CsvParser();