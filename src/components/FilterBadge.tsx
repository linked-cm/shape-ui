import * as React from 'react';
import {Badge} from '@_linked/primitives/components/Badge';
import style from './FilterBadge.module.css';

export interface FilterBadgeProps {
  label: string;
  /** A filter can be muted without being removed, so a viewer can compare with and without. */
  isActive?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  className?: string;
}

/**
 * One active filter, as a chip that can be muted or removed.
 *
 * Two controls in one badge, which is why it is a component rather than a `<Badge>` with
 * props: the body toggles and the trailing button removes, and each has to stop the other
 * from firing. Getting that wrong means a viewer aiming for "remove" mutes it instead.
 *
 * An inactive filter is dimmed rather than hidden — the point of toggling instead of removing
 * is to see the filter you have switched off.
 */
export function FilterBadge({
  label,
  isActive = true,
  onToggle,
  onRemove,
  className,
}: FilterBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'soft' : 'outline'}
      color={isActive ? 'primary' : 'neutral'}
      className={[style.Root, !isActive && style.inactive, className]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={style.toggle}
        onClick={(event) => {
          event.stopPropagation();
          onToggle?.();
        }}
        aria-pressed={isActive}
      >
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          className={style.remove}
          aria-label={`Remove filter ${label}`}
          onClick={(event) => {
            // Without this the toggle fires too, and the filter is muted on its way out.
            event.stopPropagation();
            onRemove();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </Badge>
  );
}
