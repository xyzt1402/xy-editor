import React from 'react';

interface UploadIconProps {
    size?: number;
    className?: string;
}

/**
 * Clean upload arrow icon for the DropZone overlay and default content.
 * Pure SVG — no emoji, no icon font dependency.
 */
export const UploadIcon: React.FC<UploadIconProps> = ({
    size = 24,
    className,
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
    >
        {/* Tray base */}
        <path
            d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Arrow shaft */}
        <line
            x1="12"
            y1="3"
            x2="12"
            y2="15"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
        />
        {/* Arrow head */}
        <polyline
            points="7 8 12 3 17 8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </svg>
);