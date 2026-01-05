import React from 'react';

export interface AvatarProps {
  /** Display name to generate initials from */
  displayName: string;
  /** Additional CSS classes */
  className?: string;
  /** Size in pixels (default: 40) */
  size?: number;
}

/**
 * Simple avatar showing user initials.
 * No external dependencies - just a styled div with initials.
 */
export function Avatar({ displayName, className = '', size = 40 }: AvatarProps): React.JSX.Element {
  // Get initials from display name
  const initials = getInitials(displayName);
  // Generate color from name (deterministic)
  const colorStyle = getColorStyle(displayName);

  return (
    <div
      className={`downpat-avatar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        color: 'white',
        fontWeight: 500,
        fontSize: size * 0.4,
        ...colorStyle,
      }}
      title={displayName}
      role="img"
      aria-label={`Avatar for ${displayName}`}
    >
      {initials}
    </div>
  );
}

/**
 * Extract initials from display name (max 2 characters).
 */
function getInitials(name: string): string {
  if (!name) return '?';

  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a deterministic color based on the name.
 */
function getColorStyle(name: string): React.CSSProperties {
  const colors = [
    { background: '#3b82f6' }, // blue
    { background: '#10b981' }, // green
    { background: '#8b5cf6' }, // purple
    { background: '#ec4899' }, // pink
    { background: '#f59e0b' }, // amber
    { background: '#06b6d4' }, // cyan
    { background: '#ef4444' }, // red
    { background: '#6366f1' }, // indigo
  ];

  // Simple hash to pick a color
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
