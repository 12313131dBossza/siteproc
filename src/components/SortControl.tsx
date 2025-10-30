"use client";

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SortOption {
  label: string;
  value: string;
}

interface SortControlProps {
  options: SortOption[];
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

export function SortControl({ 
  options, 
  onSortChange, 
  defaultSortBy = '', 
  defaultSortOrder = 'asc' 
}: SortControlProps) {
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  const handleSortByChange = (value: string) => {
    setSortBy(value);
    onSortChange(value, sortOrder);
  };

  const handleSortOrderToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    onSortChange(sortBy, newOrder);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={sortBy}
        onChange={(e) => handleSortByChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Sort by...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {sortBy && (
        <button
          onClick={handleSortOrderToggle}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' ? (
            <ArrowUp className="h-4 w-4 text-gray-600" />
          ) : (
            <ArrowDown className="h-4 w-4 text-gray-600" />
          )}
        </button>
      )}
    </div>
  );
}

// Utility function to sort an array
export function sortArray<T>(
  array: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  accessor: (item: T, key: string) => any
): T[] {
  if (!sortBy) return array;

  return [...array].sort((a, b) => {
    const aValue = accessor(a, sortBy);
    const bValue = accessor(b, sortBy);

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
    if (bValue == null) return sortOrder === 'asc' ? -1 : 1;

    // Handle strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    // Handle numbers and dates
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}
