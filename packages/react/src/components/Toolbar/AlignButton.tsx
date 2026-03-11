/**
 * AlignButton — A button for text alignment options.
 * @package @xy-editor/react
 * @module components/Toolbar
 *
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
    // getNodeAttribute reads from block.attrs — the correct location for
    // block-level properties like fontFamily, fontSize, and alignment.
    const { commands, getNodeAttribute } = useEditor();

    const currentAlignment =
        (getNodeAttribute('alignment') as AlignValue | undefined) ?? 'left';

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