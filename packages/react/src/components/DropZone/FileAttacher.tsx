import React, { useRef, useCallback } from 'react';
import styles from './FileAttacher.module.css';
import AttachIcon from './assets/AttachIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileAttacherProps {
    /** Callback fired when a file is selected */
    onFile: (file: File) => void;
    /** HTML accept attribute — comma-separated MIME types or extensions */
    accept?: string;
    /** Label text for the button (default: 'Choose File') */
    label?: string;
    /** Additional CSS class name */
    className?: string;
    /** Disable the file input */
    disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A styled button that opens a hidden file input dialog.
 * Use alongside DropZone as a secondary entry point, or independently.
 */
export const FileAttacher: React.FC<FileAttacherProps> = ({
    onFile,
    accept = '',
    label = 'Choose File',
    className = '',
    disabled = false,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = useCallback(() => {
        if (disabled) return;
        inputRef.current?.click();
    }, [disabled]);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onFile(file);
                e.target.value = '';
            }
        },
        [onFile],
    );

    // Note: onKeyDown is not needed here — <button> handles Enter/Space
    // natively. Adding a redundant onKeyDown handler was unnecessary.

    return (
        <>
            {/* Visually hidden input — triggered programmatically via ref */}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className={styles.input}
                onChange={handleFileChange}
                tabIndex={-1}
                aria-hidden="true"
                disabled={disabled}
            />
            <button
                type="button"
                className={[styles.button, disabled && styles.disabled, className]
                    .filter(Boolean)
                    .join(' ')}
                onClick={handleClick}
                disabled={disabled}
                aria-label={label}
            >
                <AttachIcon className={styles.icon} />
                <span className={styles.label}>{label}</span>
            </button>
        </>
    );
};

FileAttacher.displayName = 'FileAttacher';

// ─── AttachIcon ───────────────────────────────────────────────────────────────
// Inline SVG — no emoji, no external dependency.
// Paperclip shape drawn with a single smooth path.

