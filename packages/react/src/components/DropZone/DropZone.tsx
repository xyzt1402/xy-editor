import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './DropZone.module.css';
import { UploadIcon } from './assets/UploadIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DropZoneProps {
    /** Callback fired when files are dropped or selected */
    onFiles?: (files: File[]) => void;
    /**
     * Accepted MIME types and/or file extensions.
     * Supports wildcards (e.g. 'image/*'), specific MIME types,
     * and extensions (e.g. '.pdf').
     * Default: all file types accepted.
     */
    accept?: string[];
    /** Allow multiple files (default: false) */
    multiple?: boolean;
    /** Disable the drop zone */
    disabled?: boolean;
    /** Additional CSS class name */
    className?: string;
    /** Children to render inside the zone */
    children?: React.ReactNode;
    /** Accessible label for the drop zone (default: 'Drop files here') */
    label?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DropZone = ({
    onFiles,
    accept = [],
    multiple = false,
    disabled = false,
    className = '',
    children,
    label = 'Drop files here',
}: DropZoneProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => { dragCounter.current = 0; };
    }, []);

    // ── File filtering ────────────────────────────────────────────────────────

    const filterFiles = useCallback((files: File[]): File[] => {
        if (accept.length === 0) return files;

        return files.filter((file) => {
            const fileType = file.type;
            const fileName = file.name.toLowerCase();

            return accept.some((accepted) => {
                if (accepted.endsWith('/*')) {
                    return fileType.startsWith(accepted.slice(0, -1));
                }
                if (fileType === accepted) return true;
                if (accepted.startsWith('.')) {
                    return fileName.endsWith(accepted.toLowerCase());
                }
                return false;
            });
        });
    }, [accept]);

    // ── File dispatch ─────────────────────────────────────────────────────────

    const dispatchFiles = useCallback((rawFiles: File[]) => {
        const filtered = filterFiles(rawFiles);
        if (filtered.length === 0) return;
        onFiles?.(multiple ? filtered : filtered.slice(0, 1));
    }, [filterFiles, multiple, onFiles]);

    // ── Drag handlers ─────────────────────────────────────────────────────────

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        dragCounter.current++;
        if (e.dataTransfer.items.length > 0) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }, [disabled]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        e.dataTransfer.dropEffect = 'copy';
    }, [disabled]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        dragCounter.current = 0;
        setIsDragging(false);
        dispatchFiles(Array.from(e.dataTransfer.files));
    }, [disabled, dispatchFiles]);

    // ── Keyboard + click handlers ─────────────────────────────────────────────

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
        }
    }, [disabled]);

    const handleClick = useCallback(() => {
        if (disabled) return;
        fileInputRef.current?.click();
    }, [disabled]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) dispatchFiles(Array.from(files));
        e.target.value = '';
    }, [dispatchFiles]);

    // ── Class composition ─────────────────────────────────────────────────────

    const zoneClasses = [
        styles.dropZone,
        isDragging && styles.dragging,
        disabled && styles.disabled,
        className,
    ].filter(Boolean).join(' ');

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className={zoneClasses}
            role="button"
            aria-label={label}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept.join(',')}
                multiple={multiple}
                onChange={handleInputChange}
                style={{ display: 'none' }}
                tabIndex={-1}
                aria-hidden="true"
            />

            {/* Drag overlay */}
            {isDragging && (
                <div className={styles.overlay} aria-hidden="true">
                    <div className={styles.overlayContent}>
                        <UploadIcon size={28} className={styles.overlayIcon} />
                        <span className={styles.overlayText}>Drop to upload</span>
                    </div>
                </div>
            )}

            {/* Content — hidden during drag, kept in DOM to prevent layout shift */}
            <div
                className={styles.content}
                data-dragging={isDragging || undefined}
                aria-hidden={isDragging}
            >
                {children ?? (
                    <div className={styles.defaultContent}>
                        <UploadIcon size={28} className={styles.defaultIcon} />
                        <span className={styles.text}>
                            Drop files here or <span className={styles.browse}>browse</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

DropZone.displayName = 'DropZone';