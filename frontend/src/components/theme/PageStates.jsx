import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shared loading placeholder for list-style pages.
 * Keeps loading layout stable and avoids jumpy transitions when data arrives.
 */
export const ListPageSkeleton = ({ cards = 6 }) => (
  <div className="space-y-4">
    <Skeleton className="h-20 w-full rounded-card" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={`skeleton-${index}`} className="border border-app-border">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-32 w-full rounded-input" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/**
 * Shared empty state card to keep message hierarchy consistent.
 * Pass icon/content from each page so behavior stays page-specific.
 */
export const EmptyStatePanel = ({ icon, title, description, action = null }) => (
  <Card className="border-2 border-dashed border-gray-300">
    <CardContent className="p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate mb-2">{title}</h3>
      <p className="text-slate-light mb-4">{description}</p>
      {action}
    </CardContent>
  </Card>
);
