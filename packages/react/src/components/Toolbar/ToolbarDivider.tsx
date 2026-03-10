/**
 * ToolbarDivider — A vertical separator between toolbar groups.
 * @package @xy-editor/react
 * @module components/Toolbar
 */

import React from 'react';
import styles from './ToolbarDivider.module.css';

export const ToolbarDivider: React.FC = () => {
    return <div className={styles.divider} role="separator" aria-orientation="vertical" />;
};
