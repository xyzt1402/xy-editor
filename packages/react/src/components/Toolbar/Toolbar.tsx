/**
 * Toolbar — The main formatting toolbar component.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Undo2, Redo2,
} from 'lucide-react';
import { useEditor } from '../../hooks/useEditor';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarDivider } from './ToolbarDivider';
import { FontPicker } from './FontPicker';
import { SizePicker } from './SizePicker';
import { ColorButton } from './ColorButton';
import { AlignButton, type AlignValue } from './AlignButton';
import styles from './Toolbar.module.css';

// ─── Internal sub-components ──────────────────────────────────────────────────

type MarkFormat = 'bold' | 'italic' | 'underline' | 'strike';

interface FormatConfig {
    label: string;
    shortcut: string;
}

const FORMAT_CONFIG: Record<MarkFormat, FormatConfig> = {
    bold: { label: 'Bold', shortcut: '⌘B' },
    italic: { label: 'Italic', shortcut: '⌘I' },
    underline: { label: 'Underline', shortcut: '⌘U' },
    strike: { label: 'Strikethrough', shortcut: '⌘⇧X' },
};

type FormatButtonProps = { format: MarkFormat, icon: React.ReactNode }

const FormatButton = ({ format, icon }: FormatButtonProps) => {
    const { commands, isActive } = useEditor();
    const { label, shortcut } = FORMAT_CONFIG[format];

    const commandMap: Record<MarkFormat, () => void> = {
        bold: () => commands.bold(),
        italic: () => commands.italic(),
        underline: () => commands.underline(),
        strike: () => commands.strike(),
    };

    return (
        <ToolbarButton
            icon={icon}
            label={label}
            shortcut={shortcut}
            onClick={commandMap[format]}
            active={isActive(format)}
        />
    );
};

const HistoryButton: React.FC<{ type: 'undo' | 'redo'; icon: React.ReactNode }> = ({ type, icon }) => {
    const { commands } = useEditor();

    const config = {
        undo: { label: 'Undo', shortcut: '⌘Z', command: () => commands.undo() },
        redo: { label: 'Redo', shortcut: '⌘⇧Z', command: () => commands.redo() },
    }[type];

    return (
        <ToolbarButton
            icon={icon}
            label={config.label}
            shortcut={config.shortcut}
            onClick={config.command}
        />
    );
};

const ALIGN_ICONS: Record<AlignValue, React.ReactNode> = {
    left: <AlignLeft size={16} />,
    center: <AlignCenter size={16} />,
    right: <AlignRight size={16} />,
    justify: <AlignJustify size={16} />,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ToolbarGroup {
    id: string;
    buttons: React.ReactNode[];
}

export interface ToolbarProps {
    /** Additional class name applied to the toolbar root */
    className?: string;
    /** Slot rendered at the trailing end of the toolbar */
    children?: React.ReactNode;
    /** Override the default button groups. Pass an empty array for a bare toolbar shell. */
    groups?: ToolbarGroup[];
}

// Default groups defined at module level — stable reference, avoids re-creation per render
const DEFAULT_GROUPS: ToolbarGroup[] = [
    {
        id: 'history',
        buttons: [
            <HistoryButton key="undo" type="undo" icon={<Undo2 size={16} />} />,
            <HistoryButton key="redo" type="redo" icon={<Redo2 size={16} />} />,
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
        id: 'format',
        buttons: [
            <FormatButton key="bold" format="bold" icon={<Bold size={16} />} />,
            <FormatButton key="italic" format="italic" icon={<Italic size={16} />} />,
            <FormatButton key="underline" format="underline" icon={<Underline size={16} />} />,
            <FormatButton key="strike" format="strike" icon={<Strikethrough size={16} />} />,
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
        buttons: (['left', 'center', 'right', 'justify'] as AlignValue[]).map((align) => (
            <AlignButton key={align} align={align} icon={ALIGN_ICONS[align]} />
        )),
    },
];

export const Toolbar = ({ className, children, groups }: ToolbarProps) => {
    const renderGroups = groups ?? DEFAULT_GROUPS;

    return (
        <div
            role="toolbar"
            aria-label="Text formatting"
            className={[styles.toolbar, className].filter(Boolean).join(' ')}
        >
            {renderGroups.map((group, index) => (
                <React.Fragment key={group.id}>
                    {index > 0 && <ToolbarDivider />}
                    <div className={styles.group}>
                        {group.buttons}
                    </div>
                </React.Fragment>
            ))}
            {children != null && (
                <div className={styles.custom}>{children}</div>
            )}
        </div>
    );
};