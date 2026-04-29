import React from 'react';
import DealerNav from './DealerNav';

/**
 * Shared dealer page shell for Phase-2 layout consistency.
 * This keeps navigation/header and content container spacing centralized,
 * so pages can update visuals without duplicating shell markup.
 */
const DealerPageShell = ({
  children,
  contentClassName = 'max-w-7xl mx-auto px-4 py-6',
  containerClassName = 'min-h-screen theme-page',
}) => (
  <div className={containerClassName}>
    <DealerNav />
    {/* Keep content offset aligned with fixed topbar + desktop sidebar. */}
    <div className="pt-16 md:pl-60">
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  </div>
);

export default DealerPageShell;
