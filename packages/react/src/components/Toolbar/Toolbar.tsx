/**
 * Toolbar — The main formatting toolbar component.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import { ToolbarDivider } from './ToolbarDivider';
import { ToolbarButton } from './ToolbarButton';
import { FontPicker } from './FontPicker';
import { SizePicker } from './SizePicker';
import { ColorButton } from './ColorButton';
import { AlignButton } from './AlignButton';
import styles from './Toolbar.module.css';

// Import icons from lucide-react
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Undo2,
    Redo2,
} from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';

export interface ToolbarGroup {
    id: string;
    buttons: React.ReactNode[];
}

export interface ToolbarProps {
    className?: string;
    children?: React.ReactNode;
    groups?: ToolbarGroup[];
}

// List button component for bullet and ordered lists
const ListButton: React.FC<{ type: 'bullet' | 'ordered'; icon: React.ReactNode }> = ({ type, icon }) => {
    const label = type === 'bullet' ? 'Bullet list' : 'Numbered list';

    return (
        <ToolbarButton
            icon={icon}
            label={label}
            onClick={() => {
                // TODO: Implement list commands
                // For now, this is a placeholder
            }}
            active={false}
        />
    );
};

// Format button component (bold, italic, etc.)
const FormatButton: React.FC<{ format: 'bold' | 'italic' | 'underline' | 'strike'; icon: React.ReactNode }> = ({ format, icon }) => {
    const { commands, isActive } = useEditor();

    const formatMap = {
        bold: { label: 'Bold', command: () => commands.bold(), shortcut: '⌘B' },
        italic: { label: 'Italic', command: () => commands.italic(), shortcut: '⌘I' },
        underline: { label: 'Underline', command: () => commands.underline(), shortcut: '⌘U' },
        strike: { label: 'Strikethrough', command: () => commands.strike(), shortcut: '⌘⇧X' },
    };

    const { label, command, shortcut } = formatMap[format];

    return (
        <ToolbarButton
            icon={icon}
            label={label}
            onClick={command}
            active={isActive(format as never)}
            shortcut={shortcut}
        />
    );
};

// History button component
const HistoryButton: React.FC<{ type: 'undo' | 'redo'; icon: React.ReactNode }> = ({ type, icon }) => {
    const { commands } = useEditor();

    const historyMap = {
        undo: { label: 'Undo', command: () => commands.undo(), shortcut: '⌘Z' },
        redo: { label: 'Redo', command: () => commands.redo(), shortcut: '⌘⇧Z' },
    };

    const { label, command, shortcut } = historyMap[type];

    return (
        <ToolbarButton
            icon={icon}
            label={label}
            onClick={command}
            shortcut={shortcut}
        />
    );
};

export const Toolbar: React.FC<ToolbarProps> = ({ className, children, groups }) => {
    // Default groups if not provided
    const defaultGroups: ToolbarGroup[] = [
        {
            id: 'history',
            buttons: [
                <HistoryButton key="undo" type="undo" icon={<Undo2 size={18} />} />,
                <HistoryButton key="redo" type="redo" icon={<Redo2 size={18} />} />,
            ],
        },
        {
            id: 'format',
            buttons: [
                <FormatButton key="bold" format="bold" icon={<Bold size={18} />} />,
                <FormatButton key="italic" format="italic" icon={<Italic size={18} />} />,
                <FormatButton key="underline" format="underline" icon={<Underline size={18} />} />,
                <FormatButton key="strike" format="strike" icon={<Strikethrough size={18} />} />,
            ],
        },
        {
            id: 'font',
            buttons: [
                <FontPicker key="font" />,
                <SizePicker key="size" />,
            ],
        },
        {
            id: 'color',
            buttons: [
                <ColorButton key="text" type="text" />,
                <ColorButton key="highlight" type="highlight" />,
            ],
        },
        {
            id: 'align',
            buttons: [
                <AlignButton key="left" align="left" icon={<AlignLeft size={18} />} />,
                <AlignButton key="center" align="center" icon={<AlignCenter size={18} />} />,
                <AlignButton key="right" align="right" icon={<AlignRight size={18} />} />,
                <AlignButton key="justify" align="justify" icon={<AlignJustify size={18} />} />,
            ],
        },
        {
            id: 'list',
            buttons: [
                <ListButton key="bullet" type="bullet" icon={<List size={18} />} />,
                <ListButton key="ordered" type="ordered" icon={<ListOrdered size={18} />} />,
            ],
        },
    ];

    const renderGroups = groups ?? defaultGroups;

    return (
        <div
            role="toolbar"
            aria-label="Text formatting"
            className={`${styles.toolbar} ${className ?? ''}`}
        >
            {renderGroups.map((group, index) => (
                <React.Fragment key={group.id}>
                    {index > 0 && <ToolbarDivider />}
                    <div className={styles.group}>
                        {group.buttons}
                    </div>
                </React.Fragment>
            ))}
            {children && <div className={styles.custom}>{children}</div>}
        </div>
    );
};
