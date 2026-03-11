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

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    icon,
    label,
    onClick,
    active = false,
    disabled = false,
    shortcut,
}) => {
    const tooltipContent = shortcut ? `${label} ${shortcut}` : label;

    return (
        <button
            type="button"
            className={styles.button}
            aria-label={label}
            aria-pressed={active}
            data-active={active || undefined}
            data-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
        >
            <span className={styles.icon} aria-hidden="true">
                {icon}
            </span>
            {/* CSS-only tooltip — hidden via opacity/visibility, never read by screen readers */}
            <span className={styles.tooltip} aria-hidden="true">
                {tooltipContent}
            </span>
        </button>
    );
};