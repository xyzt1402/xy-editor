/**
 * SizePicker — A dropdown for selecting font size.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import { useEditor } from '../../hooks/useEditor';
import styles from './SizePicker.module.css';

const SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72] as const;

export const SizePicker: React.FC = () => {
    const { getAttributes, commands } = useEditor();

    const currentFontSize = getAttributes('fontFamily')?.fontSize as number | null;
    const currentSize = currentFontSize ?? 14;

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
            {SIZES.map((size) => (
                <option key={size} value={size}>
                    {size}px
                </option>
            ))}
        </select>
    );
};
