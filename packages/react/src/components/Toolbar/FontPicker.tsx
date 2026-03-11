/**
 * FontPicker — A dropdown for selecting font family.
 * @package @xy-editor/react
 * @module components/Toolbar
 *
 */

import React from 'react';
import { useEditor } from '../../hooks/useEditor';
import styles from './FontPicker.module.css';

export const FONT_OPTIONS = [
    { label: 'Arial', value: 'Arial' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS' },
    { label: 'IBM Plex Sans', value: 'IBM Plex Sans' },
    { label: 'IBM Plex Serif', value: 'IBM Plex Serif' },
    { label: 'IBM Plex Mono', value: 'IBM Plex Mono' },
] as const;

const DEFAULT_FONT = 'Arial';

export const FontPicker: React.FC = () => {
    // getNodeAttribute reads from block.attrs — the correct location for
    // block-level properties like fontFamily, fontSize, and alignment.
    const { getNodeAttribute, commands } = useEditor();

    const currentFont = (getNodeAttribute('fontFamily') as string | undefined) ?? DEFAULT_FONT;

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
            {FONT_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value} data-font={value}>
                    {label}
                </option>
            ))}
        </select>
    );
};