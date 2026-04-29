import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Standard page/section header.
 * Use this to keep title/subtitle/action alignment consistent across dealer pages.
 */
const SectionHeader = ({
  title,
  subtitle,
  actions = null,
  className = '',
  titleClassName = 'text-3xl font-display font-bold text-slate',
  subtitleClassName = 'mt-1 text-slate-light',
}) => (
  <div className={cn('mb-6 flex items-start justify-between gap-4', className)}>
    <div>
      <h1 className={titleClassName}>{title}</h1>
      {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
  </div>
);

export default SectionHeader;
