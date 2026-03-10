/**
 * ColorButton — A button for selecting text color or highlight color.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../../hooks/useEditor';
import styles from './ColorButton.module.css';

export interface ColorButtonProps {
    type: 'text' | 'highlight';
}

const PRESET_COLORS = [
    '#000000',
    '#ffffff',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#374151',
    '#6b7280',
    '#fee2e2',
    '#fef9c3',
    '#dcfce7',
    '#dbeafe',
    '#ede9fe',
    '#fce7f3',
    '#f1f5f9',
    '#1e293b',
] as const;

export const ColorButton: React.FC<ColorButtonProps> = ({ type }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const { commands } = useEditor();

    const label = type === 'text' ? 'Text color' : 'Highlight color';

    // Close popover on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    // Close popover on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                isOpen &&
                buttonRef.current &&
                popoverRef.current &&
                !buttonRef.current.contains(e.target as Node) &&
                !popoverRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleColorSelect = (color: string) => {
        if (type === 'text') {
            commands.setColor(color);
        } else {
            commands.setHighlight(color);
        }
        setIsOpen(false);
    };

    const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleColorSelect(e.target.value);
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
                onClick={() => setIsOpen(!isOpen)}
                data-color-type={type}
            >
                <span className={styles.indicator} data-color-type={type} />
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
                                className={styles.swatch}
                                style={{ backgroundColor: color }}
                                data-color={color}
                                onClick={() => handleColorSelect(color)}
                                aria-label={`Select color ${color}`}
                                role="option"
                            />
                        ))}
                    </div>
                    <div className={styles.nativeInputContainer}>
                        <label className={styles.nativeLabel}>Custom</label>
                        <input
                            type="color"
                            className={styles.nativeInput}
                            value={type === 'text' ? '#000000' : '#ffff00'}
                            onChange={handleNativeColorChange}
                            aria-label="Custom color"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
