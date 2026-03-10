import React from 'react';
import styles from './FileTypeChip.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileTypeChipProps {
    /** The file type to display (e.g. 'PDF', 'DOCX', 'CSV') */
    type: string;
    /** Additional CSS class name */
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A small pill component that displays a detected file type.
 * Colours are defined entirely in CSS via data-type attribute selectors.
 * To add a new type or override a colour, extend FileTypeChip.module.css.
 */
export const FileTypeChip: React.FC<FileTypeChipProps> = ({
    type,
    className = '',
}) => {
    const normalised = type.toUpperCase();

    return (
        <span
            className={[styles.chip, className].filter(Boolean).join(' ')}
            data-type={normalised}
            title={`File type: ${normalised}`}
        >
            <span className={styles.dot} aria-hidden="true" />
            {normalised}
        </span>
    );
};

FileTypeChip.displayName = 'FileTypeChip';