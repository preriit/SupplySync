import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable breadcrumb for dealer pages.
 * Keeps hierarchy and clickable navigation consistent across screens.
 */
const AppBreadcrumb = ({ items = [] }) => (
  <nav className="mb-4 text-sm text-slate-light" aria-label="Breadcrumb">
    <ol className="flex items-center flex-wrap gap-1">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {isLast ? (
              <span className="text-slate font-medium">{item.label}</span>
            ) : (
              <Link to={item.to} className="hover:text-orange">
                {item.label}
              </Link>
            )}
            {!isLast && <span className="mx-1">{'>'}</span>}
          </React.Fragment>
        );
      })}
    </ol>
  </nav>
);

export default AppBreadcrumb;
