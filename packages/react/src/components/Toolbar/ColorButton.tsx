/**
 * ColorButton — A button for selecting text color or highlight color.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor } from '../../hooks/useEditor';
import styles from './ColorButton.module.css';

export interface ColorButtonProps {
    type: 'text' | 'highlight';
}

const PRESET_COLORS = [
    '#000000', '#374151', '#6b7280', '#9ca3af', '#ffffff',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#fee2e2', '#fef9c3', '#dcfce7', '#dbeafe', '#ede9fe',
] as const;

const DEFAULTS: Record<ColorButtonProps['type'], string> = {
    text: '#000000',
    highlight: '#fef08a',
};

const MARK_TYPE: Record<ColorButtonProps['type'], string> = {
    text: 'color',
    highlight: 'highlight',
};

export const ColorButton: React.FC<ColorButtonProps> = ({ type }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const { commands, getAttributes } = useEditor();

    const label = type === 'text' ? 'Text color' : 'Highlight color';

    const markType = MARK_TYPE[type];
    const editorColor = getAttributes(markType)?.color as string | undefined;
    const indicatorColor = editorColor ?? DEFAULTS[type];

    const [pickerValue, setPickerValue] = useState(indicatorColor);
    const handleOpen = () => {
        setPickerValue(indicatorColor);
        setIsOpen((v) => !v);
    };

    // ── Close on Escape ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // ── Close on click outside ────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (
                !buttonRef.current?.contains(e.target as Node) &&
                !popoverRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isOpen]);

    // ── Apply a preset swatch ─────────────────────────────────────────────────
    const applyColor = useCallback((color: string) => {
        if (type === 'text') {
            commands.setColor(color);
        } else {
            commands.setHighlight(color);
        }
        setIsOpen(false);
    }, [type, commands]);

    // ── Native color input (live preview while dragging) ──────────────────────
    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        setPickerValue(color);
        if (type === 'text') {
            commands.setColor(color);
        } else {
            commands.setHighlight(color);
        }
    };

    return (
        <div className={styles.container}>
            {/*
             * --indicator-color is set on the button in both cases.
             *
             * type="text"      → .indicator span reads it for the underbar.
             *                    Button background is unchanged.
             *
             * type="highlight" → CSS rule
             *                    .button[data-color-type="highlight"]
             *                    sets background-color: var(--indicator-color).
             *                    No extra elements needed — the button itself
             *                    becomes the color swatch.
             */}
            <button
                ref={buttonRef}
                type="button"
                className={styles.button}
                aria-label={label}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                data-color-type={type}
                onClick={handleOpen}
                style={{ '--indicator-color': indicatorColor } as React.CSSProperties}
            >
                {type === 'text' ? 'A' : 'H'}
                <span
                    className={styles.indicator}
                    data-color-type={type}
                    aria-hidden="true"
                >
                    <span className={styles.indicatorBar} />
                </span>
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className={styles.popover}
                    role="listbox"
                    aria-label={label}
                >
                    <div className={styles.swatchGrid}>
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                role="option"
                                className={styles.swatch}
                                data-color={color}
                                data-selected={indicatorColor === color || undefined}
                                aria-label={`Select color ${color}`}
                                aria-selected={indicatorColor === color}
                                onClick={() => applyColor(color)}
                                style={{ '--c': color } as React.CSSProperties}
                            />
                        ))}
                    </div>

                    <div className={styles.nativeInputContainer}>
                        <label htmlFor={`color-input-${type}`} className={styles.nativeLabel}>
                            Custom
                        </label>
                        <input
                            id={`color-input-${type}`}
                            type="color"
                            className={styles.nativeInput}
                            value={pickerValue}
                            onChange={handleNativeChange}
                            aria-label="Custom color"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};