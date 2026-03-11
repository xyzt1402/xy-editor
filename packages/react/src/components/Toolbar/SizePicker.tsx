/**
 * SizePicker — A dropdown for selecting font size.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import { useEditor } from '../../hooks/useEditor';
import styles from './SizePicker.module.css';

export const SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72] as const;

const DEFAULT_SIZE = 14;

export const SizePicker: React.FC = () => {
    const { getAttributes, commands } = useEditor();

    // FIX: was incorrectly reading from 'fontFamily' key — must use 'fontSize'
    const currentSize =
        (getAttributes('fontSize')?.fontSize as number | null) ?? DEFAULT_SIZE;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        commands.setFontSize(Number(e.target.value));
    };

    return (
        <select
            className={styles.select}
            aria-label="Font size"
            value={currentSize}
            onChange={handleChange}
        >
            {SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                    {size}
                </option>
            ))}
        </select>
    );
};