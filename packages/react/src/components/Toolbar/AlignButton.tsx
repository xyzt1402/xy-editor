/**
 * AlignButton — A button for text alignment options.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import { useEditor } from '../../hooks/useEditor';
import { ToolbarButton } from './ToolbarButton';

export type AlignValue = 'left' | 'center' | 'right' | 'justify';

export interface AlignButtonProps {
    align: AlignValue;
    icon: React.ReactNode;
}

const ALIGN_LABELS: Record<AlignValue, string> = {
    left: 'Align left',
    center: 'Align center',
    right: 'Align right',
    justify: 'Align justify',
};

export const AlignButton: React.FC<AlignButtonProps> = ({ align, icon }) => {
    const { commands, getAttributes } = useEditor();

    // Read alignment from node attributes (no type-cast needed)
    const currentAlignment = getAttributes('alignment')?.alignment as AlignValue | null;
    const isActive = currentAlignment === align;

    return (
        <ToolbarButton
            icon={icon}
            label={ALIGN_LABELS[align]}
            onClick={() => commands.setAlignment(align)}
            active={isActive}
        />
    );
};