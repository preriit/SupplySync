import React from 'react';
import { cn } from '@/lib/utils';

const toneClassMap = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  brand: 'bg-orange-100 text-orange-700',
};

/**
 * Small semantic status chip used across list/cards.
 * Keeps visual meaning (success/warning/danger/etc.) consistent across pages.
 */
const StatusChip = ({ children, tone = 'neutral', className = '' }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium',
      toneClassMap[tone] || toneClassMap.neutral,
      className,
    )}
  >
    {children}
  </span>
);

export default StatusChip;
