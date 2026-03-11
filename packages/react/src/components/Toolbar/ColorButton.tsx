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

export const ColorButton: React.FC<ColorButtonProps> = ({ type }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentColor, setCurrentColor] = useState(DEFAULTS[type]);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const { commands, getAttributes } = useEditor();

    const label = type === 'text' ? 'Text color' : 'Highlight color';

    // Sync current color from editor state
    const attrKey = type === 'text' ? 'color' : 'highlight';
    const editorColor = getAttributes(attrKey)?.[attrKey] as string | null;
    const indicatorColor = editorColor ?? DEFAULTS[type];

    // Close on Escape
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

    // Close on click outside
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

    const applyColor = useCallback((color: string) => {
        setCurrentColor(color);
        if (type === 'text') {
            commands.setColor(color);
        } else {
            commands.setHighlight(color);
        }
        setIsOpen(false);
    }, [type, commands]);

    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Update live as user picks — don't close until they commit
        setCurrentColor(e.target.value);
        if (type === 'text') {
            commands.setColor(e.target.value);
        } else {
            commands.setHighlight(e.target.value);
        }
    };

    return (
        <div className={styles.container}>
            <button
                ref={buttonRef}
                type="button"
                className={styles.button}
                aria-label={label}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                data-color-type={type}
                onClick={() => setIsOpen((v) => !v)}
            >
                {/* Indicator bar — colour set via CSS custom property, no inline style */}
                <span
                    className={styles.indicator}
                    data-color-type={type}
                    style={{ '--indicator-color': indicatorColor } as React.CSSProperties}
                />
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
                                // Single CSS custom property — minimal, accepted pattern
                                // (same approach as FileTypeChip --chip-color)
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
                            value={currentColor}
                            onChange={handleNativeChange}
                            aria-label="Custom color"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};