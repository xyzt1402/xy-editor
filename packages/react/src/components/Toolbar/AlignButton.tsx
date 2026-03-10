/**
 * AlignButton — A button for text alignment options.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import { useEditor } from '../../hooks/useEditor';
import { ToolbarButton } from './ToolbarButton';

export interface AlignButtonProps {
    align: 'left' | 'center' | 'right' | 'justify';
    icon: React.ReactNode;
}

export const AlignButton: React.FC<AlignButtonProps> = ({ align, icon }) => {
    const { commands, getAttributes } = useEditor();

    // Check if this alignment is active via node attributes
    const currentAlignment = getAttributes('alignment' as never)?.alignment as string | null;
    const isActive = currentAlignment === align;

    const handleClick = () => {
        commands.setAlignment(align);
    };

    const label = `Align ${align}`;

    return (
        <ToolbarButton
            icon={icon}
            label={label}
            onClick={handleClick}
            active={isActive}
        />
    );
};
