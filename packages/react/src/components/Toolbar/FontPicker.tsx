/**
 * FontPicker — A dropdown for selecting font family.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import { useEditor } from '../../hooks/useEditor';
import styles from './FontPicker.module.css';

const FONTS = [
    'Arial',
    'Georgia',
    'Times New Roman',
    'Courier New',
    'Verdana',
    'Trebuchet MS',
    'IBM Plex Sans',
    'IBM Plex Serif',
    'IBM Plex Mono',
] as const;

export const FontPicker: React.FC = () => {
    const { getAttributes, commands } = useEditor();

    const currentFontFamily = getAttributes('fontFamily')?.fontFamily as string | null;
    const currentFont = currentFontFamily ?? 'Arial';

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        commands.setFontFamily(e.target.value);
    };

    return (
        <select
            className={styles.select}
            aria-label="Font family"
            value={currentFont}
            onChange={handleChange}
        >
            {FONTS.map((font) => (
                <option key={font} value={font} data-font={font}>
                    {font}
                </option>
            ))}
        </select>
    );
};
