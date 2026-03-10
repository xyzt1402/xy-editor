/**
 * Stories for DropZone, FileAttacher, and FileTypeChip components.
 * @package @xy-editor/react
 */

import type { Meta, StoryObj } from '@storybook/react';
import { DropZone } from '../DropZone';
import type { DropZoneProps } from '../DropZone';
import { FileAttacher } from '../FileAttacher';
import { FileTypeChip } from '../FileTypeChip';
import { UploadIcon } from '../assets/UploadIcon';
import styles from './DropZone.stories.module.css';

// ─── DropZone Meta ────────────────────────────────────────────────────────────

const meta = {
    title: 'Components/DropZone',
    component: DropZone,
    argTypes: {
        onFiles: { action: 'files received' },
        accept: { control: 'object' },
        multiple: { control: 'boolean' },
        disabled: { control: 'boolean' },
        label: { control: 'text' },
        className: { control: false },
        children: { control: false },
    },
    args: {
        // Shared defaults — no children here so Default story renders
        // the component's own built-in fallback content
        multiple: false,
        disabled: false,
        accept: [],
        label: 'Drop files here',
    },
} satisfies Meta<DropZoneProps>;

export default meta;
type Story = StoryObj<DropZoneProps>;

// ─── Default ──────────────────────────────────────────────────────────────────
// No children — renders the component's own built-in slot:
// UploadIcon + "Drop files here or browse"

export const Default: Story = {};

// ─── States ───────────────────────────────────────────────────────────────────

export const Disabled: Story = {
    args: {
        disabled: true,
    },
};

export const MultipleFiles: Story = {
    name: 'Multiple Files',
    args: {
        multiple: true,
    },
};

export const WithAcceptFilter: Story = {
    name: 'With Accept Filter',
    args: {
        accept: ['.pdf', '.docx', '.txt'],
    },
    render: (args) => (
        <DropZone {...args}>
            <div className={styles.storyContent}>
                <UploadIcon size={28} className={styles.storyIcon} />
                <span className={styles.storyLabelPrimary}>
                    PDF, DOCX and TXT only
                </span>
                <span className={styles.storyLabel}>
                    Other file types will be ignored
                </span>
            </div>
        </DropZone>
    ),
};

// ─── Custom children ──────────────────────────────────────────────────────────

export const WithFilePreview: Story = {
    name: 'With File Preview',
    render: (args) => (
        <DropZone {...args}>
            <div className={styles.storyContent}>
                <UploadIcon size={28} className={styles.storyIcon} />
                <span className={styles.storyFilename}>report-q3-2024.pdf</span>
                <div className={styles.storyChips}>
                    <FileTypeChip type="PDF" />
                </div>
                <span className={styles.storyLabel}>Drop a new file to replace</span>
            </div>
        </DropZone>
    ),
};

// ─── Composed ─────────────────────────────────────────────────────────────────

export const WithFileAttacher: Story = {
    name: 'With FileAttacher',
    args: {
        accept: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
    },
    render: (args) => (
        <div className={styles.storyComposed}>
            <DropZone {...args}>
                <div className={styles.storyContent}>
                    <UploadIcon size={28} className={styles.storyIcon} />
                    <span className={styles.storyLabel}>
                        Drag and drop PDF or DOCX files
                    </span>
                    <div className={styles.storyChips}>
                        <FileTypeChip type="PDF" />
                        <FileTypeChip type="DOCX" />
                    </div>
                </div>
            </DropZone>
            <FileAttacher
                onFile={(file) => console.log('Selected file:', file)}
                accept=".pdf,.docx"
                label="Or click to browse"
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Combine `DropZone` with `FileAttacher` for both drag-and-drop and click-to-browse entry points.',
            },
        },
    },
};

// ─── FileAttacher ─────────────────────────────────────────────────────────────

export const FileAttacherDefault: StoryObj<typeof FileAttacher> = {
    name: 'FileAttacher / Default',
    render: () => (
        <FileAttacher
            onFile={(file) => console.log('Selected file:', file)}
            label="Choose File"
        />
    ),
};

export const FileAttacherImageOnly: StoryObj<typeof FileAttacher> = {
    name: 'FileAttacher / Image Only',
    render: () => (
        <FileAttacher
            onFile={(file) => console.log('Selected file:', file)}
            accept="image/*"
            label="Choose Image"
        />
    ),
};

// ─── FileTypeChip ─────────────────────────────────────────────────────────────

const FILE_TYPES = ['PDF', 'DOCX', 'XLSX', 'CSV', 'PNG', 'JPG', 'MP4', 'ZIP'] as const;

export const FileTypeChipAllColors: StoryObj<typeof FileTypeChip> = {
    name: 'FileTypeChip / All Colors',
    render: () => (
        <div className={styles.fileTypeGrid}>
            {FILE_TYPES.map((type) => (
                <FileTypeChip key={type} type={type} />
            ))}
        </div>
    ),
};

// FileTypeChipCustomColor removed — color prop no longer exists.
// To customise a chip colour, override --chip-color in your own CSS:
//   .myContext [data-type="PDF"] { --chip-color: hotpink; }