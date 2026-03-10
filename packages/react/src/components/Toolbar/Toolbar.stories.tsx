/**
 * Stories for Toolbar component.
 * @package @xy-editor/react
 */

import type { Meta, StoryObj } from '@storybook/react';
import { EditorProvider } from '../../context/EditorContext';
import { createEmptyState } from '@xy-editor/core';
import { Toolbar } from './Toolbar';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarDivider } from './ToolbarDivider';
import { FontPicker } from './FontPicker';
import { SizePicker } from './SizePicker';
import { ColorButton } from './ColorButton';
import { AlignButton } from './AlignButton';
import {
    Bold,
    Italic,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
} from 'lucide-react';
import styles from './Toolbar.stories.module.css';

// Wrapper to provide EditorContext
const EditorWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <EditorProvider defaultValue={createEmptyState()}>
        {children}
    </EditorProvider>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
    title: 'Components/Toolbar',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: Toolbar as any,
    decorators: [
        (Story: () => React.JSX.Element) => (
            <EditorWrapper>
                <Story />
            </EditorWrapper>
        ),
    ],
} satisfies Meta;

export default meta;

// ─── Stories ────────────────────────────────────────────────────────────────

export const Default: StoryObj = {};

export const WithCustomClassName: StoryObj = {
    name: 'With Custom ClassName',
    render: () => (
        <EditorWrapper>
            <Toolbar className={styles.customToolbar} />
        </EditorWrapper>
    ),
};

export const WithCustomChildren: StoryObj = {
    name: 'With Custom Children',
    render: () => (
        <EditorWrapper>
            <Toolbar>
                <ToolbarButton
                    icon={<span>🔗</span>}
                    label="Insert Link"
                    onClick={() => { }}
                />
            </Toolbar>
        </EditorWrapper>
    ),
};

export const Empty: StoryObj = {
    name: 'Empty Toolbar',
    render: () => (
        <EditorWrapper>
            <Toolbar groups={[]} />
        </EditorWrapper>
    ),
};

// ─── Subcomponent Stories ─────────────────────────────────────────────────

export const ToolbarButtonStories: StoryObj = {
    name: 'ToolbarButton Variants',
    render: () => (
        <EditorWrapper>
            <div style={{ display: 'flex', gap: '8px' }}>
                <ToolbarButton
                    icon={<Bold size={18} />}
                    label="Bold"
                    onClick={() => { }}
                />
                <ToolbarButton
                    icon={<Bold size={18} />}
                    label="Bold Active"
                    onClick={() => { }}
                    active
                />
                <ToolbarButton
                    icon={<Bold size={18} />}
                    label="Bold Disabled"
                    onClick={() => { }}
                    disabled
                />
                <ToolbarButton
                    icon={<Bold size={18} />}
                    label="Bold"
                    onClick={() => { }}
                    shortcut="⌘B"
                />
            </div>
        </EditorWrapper>
    ),
};

export const FontPickerStory: StoryObj = {
    name: 'FontPicker',
    render: () => (
        <EditorWrapper>
            <FontPicker />
        </EditorWrapper>
    ),
};

export const SizePickerStory: StoryObj = {
    name: 'SizePicker',
    render: () => (
        <EditorWrapper>
            <SizePicker />
        </EditorWrapper>
    ),
};

export const ColorButtonStories: StoryObj = {
    name: 'ColorButton Variants',
    render: () => (
        <EditorWrapper>
            <div style={{ display: 'flex', gap: '8px' }}>
                <ColorButton type="text" />
                <ColorButton type="highlight" />
            </div>
        </EditorWrapper>
    ),
};

export const AlignButtonStories: StoryObj = {
    name: 'AlignButton Variants',
    render: () => (
        <EditorWrapper>
            <div style={{ display: 'flex', gap: '4px' }}>
                <AlignButton align="left" icon={<AlignLeft size={18} />} />
                <AlignButton align="center" icon={<AlignCenter size={18} />} />
                <AlignButton align="right" icon={<AlignRight size={18} />} />
                <AlignButton align="justify" icon={<AlignJustify size={18} />} />
            </div>
        </EditorWrapper>
    ),
};

export const DividerStory: StoryObj = {
    name: 'ToolbarDivider',
    render: () => (
        <EditorWrapper>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ToolbarButton
                    icon={<Bold size={18} />}
                    label="Bold"
                    onClick={() => { }}
                />
                <ToolbarDivider />
                <ToolbarButton
                    icon={<Italic size={18} />}
                    label="Italic"
                    onClick={() => { }}
                />
            </div>
        </EditorWrapper>
    ),
};
