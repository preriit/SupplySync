import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable toolbar shell for list pages (search/filters/actions).
 * Keeps control density and spacing stable without changing page behavior.
 */
const PageToolbar = ({
  left = null,
  right = null,
  className = '',
}) => (
  <div className={cn('rounded-card border border-app-border bg-app-surface p-3', className)}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">{left}</div>
      <div className="flex items-center gap-2 flex-wrap">{right}</div>
    </div>
  </div>
);

export default PageToolbar;
