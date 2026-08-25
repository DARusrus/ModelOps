import React from 'react';

export function ResultViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-6 bg-white border border-gray-300 rounded-md shadow-xs">
      <div className="h-7 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-24 bg-gray-100 rounded mb-4"></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="h-16 bg-gray-100 rounded"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
      </div>
      <div className="h-32 bg-gray-100 rounded"></div>
    </div>
  );
}

export function RunComparisonSkeleton() {
  return (
    <div className="p-6 bg-white border border-gray-300 rounded-md shadow-xs animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-36 bg-gray-100 rounded"></div>
        <div className="h-36 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
}
