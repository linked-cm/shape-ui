import * as React from 'react';
import {Badge} from '@_linked/primitives/components/Badge';

export interface NodeBadgeProps {
  /** What identifies the node — a label where it has one, otherwise its IRI. */
  text: string;
  onClick?: () => void;
  /** Whether the badge acts on a click. A read-only host may not navigate. */
  clickable?: boolean;
  title?: string;
  className?: string;
}

/**
 * A chip standing for one node.
 *
 * The only badge this package needs, and it is a thin composition over the presentational
 * primitive. It exists as its own component rather than as a bare `<Badge>` for one reason:
 * "a related instance" is a shape-domain concept, and a table cell, a form field and a
 * read-only view must render it identically. A caller reaching for the primitive directly
 * would have to remember which variant and colour meant "node", and eventually two of them
 * would disagree.
 *
 * `clickable` is separate from `onClick` deliberately. A host that cannot navigate still
 * passes a handler in some code paths, and a chip that looks interactive and does nothing is
 * worse than one that looks inert.
 */
export function NodeBadge({
  text,
  onClick,
  clickable = false,
  title,
  className,
}: NodeBadgeProps) {
  const interactive = clickable && !!onClick;

  if (!interactive) {
    return (
      <Badge variant="soft" color="neutral" title={title} className={className}>
        {text}
      </Badge>
    );
  }

  return (
    <Badge variant="soft" color="neutral" title={title} className={className} asChild>
      <button
        type="button"
        onClick={(event) => {
          // A node chip frequently sits inside a clickable row. Without this, choosing the
          // chip also triggers the row.
          event.stopPropagation();
          onClick?.();
        }}
      >
        {text}
      </button>
    </Badge>
  );
}
