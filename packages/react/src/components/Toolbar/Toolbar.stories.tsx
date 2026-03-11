/**
 * Stories for Toolbar components.
 * @package @xy-editor/react
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { EditorProvider } from '../../context/EditorContext';
import { createEmptyState } from '@xy-editor/core';
import { Toolbar } from './Toolbar';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarDivider } from './ToolbarDivider';
import { FontPicker } from './FontPicker';
import { SizePicker } from './SizePicker';
import { ColorButton } from './ColorButton';
import { AlignButton } from './AlignButton';
import styles from './Toolbar.stories.module.css';

// ─── Decorator ────────────────────────────────────────────────────────────────

const withEditor = (Story: () => React.JSX.Element) => (
    <EditorProvider defaultValue={createEmptyState()}>
        <Story />
    </EditorProvider>
);

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
    title: 'Components/Toolbar',
    component: Toolbar,
    decorators: [withEditor],
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Toolbar stories ──────────────────────────────────────────────────────────

export const Default: Story = {};

export const WithCustomClassName: Story = {
    name: 'Custom className',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <Toolbar className={styles.customToolbar} />
        </EditorProvider>
    ),
};

export const WithCustomChildren: Story = {
    name: 'Custom trailing children',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <Toolbar>
                <ToolbarButton
                    icon={<span aria-hidden="true">🔗</span>}
                    label="Insert link"
                    onClick={() => { }}
                />
            </Toolbar>
        </EditorProvider>
    ),
};

export const EmptyToolbar: Story = {
    name: 'Empty (groups=[])',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <Toolbar groups={[]} />
        </EditorProvider>
    ),
};

// ─── Sub-component stories ────────────────────────────────────────────────────

export const ToolbarButtonVariants: Story = {
    name: 'ToolbarButton — variants',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <div className={styles.row}>
                <ToolbarButton icon={<Bold size={16} />} label="Bold" onClick={() => { }} />
                <ToolbarButton icon={<Bold size={16} />} label="Bold active" onClick={() => { }} active />
                <ToolbarButton icon={<Bold size={16} />} label="Bold disabled" onClick={() => { }} disabled />
                <ToolbarButton icon={<Bold size={16} />} label="Bold" onClick={() => { }} shortcut="⌘B" />
            </div>
        </EditorProvider>
    ),
};

export const FontPickerStory: Story = {
    name: 'FontPicker',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <div className={styles.row}>
                <FontPicker />
            </div>
        </EditorProvider>
    ),
};

export const SizePickerStory: Story = {
    name: 'SizePicker',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <div className={styles.row}>
                <SizePicker />
            </div>
        </EditorProvider>
    ),
};

export const ColorButtonVariants: Story = {
    name: 'ColorButton — text & highlight',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <div className={styles.row}>
                <ColorButton type="text" />
                <ColorButton type="highlight" />
            </div>
        </EditorProvider>
    ),
};

export const AlignButtonVariants: Story = {
    name: 'AlignButton — all alignments',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <div className={styles.row}>
                <AlignButton align="left" icon={<AlignLeft size={16} />} />
                <AlignButton align="center" icon={<AlignCenter size={16} />} />
                <AlignButton align="right" icon={<AlignRight size={16} />} />
                <AlignButton align="justify" icon={<AlignJustify size={16} />} />
            </div>
        </EditorProvider>
    ),
};

export const DividerStory: Story = {
    name: 'ToolbarDivider',
    render: () => (
        <EditorProvider defaultValue={createEmptyState()}>
            <div className={styles.row}>
                <ToolbarButton icon={<Bold size={16} />} label="Bold" onClick={() => { }} />
                <ToolbarDivider />
                <ToolbarButton icon={<Italic size={16} />} label="Italic" onClick={() => { }} />
            </div>
        </EditorProvider>
    ),
};