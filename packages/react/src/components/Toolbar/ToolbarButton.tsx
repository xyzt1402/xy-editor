/**
 * ToolbarButton — A button component for the formatting toolbar.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import styles from './ToolbarButton.module.css';

export interface ToolbarButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    shortcut?: string;
}

/**
 * Renders a toolbar button with CSS-only tooltip support.
 * - data-active attribute when pressed/tinted
 * - data-disabled attribute when disabled
 * - CSS-only tooltip showing label + shortcut on hover/focus-visible
 */
export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    icon,
    label,
    onClick,
    active = false,
    disabled = false,
    shortcut,
}) => {
    const buttonProps = {
        type: 'button' as const,
        className: styles.button,
        'aria-label': label,
        'aria-pressed': active,
        'data-active': active || undefined,
        'data-disabled': disabled || undefined,
        onClick: disabled ? undefined : onClick,
        disabled: disabled,
    };

    const tooltipContent = shortcut ? `${label} ${shortcut}` : label;

    return (
        <button {...buttonProps}>
            <span className={styles.icon}>{icon}</span>
            <span className={styles.tooltip} data-tooltip={tooltipContent}>
                {tooltipContent}
            </span>
        </button>
    );
};
