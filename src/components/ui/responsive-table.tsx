'use client';

import React from 'react';

interface Column {
  header: string;
  accessor: string | ((row: any) => React.ReactNode);
  className?: string;
  mobileLabel?: string; // Label to show on mobile
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
}

export function ResponsiveTable({ columns, data, onRowClick, emptyMessage = 'No data available' }: ResponsiveTableProps) {
  const getValue = (row: any, accessor: string | ((row: any) => React.ReactNode)) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
              >
                {columns.map((column, colIdx) => (
                  <td key={colIdx} className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}>
                    {getValue(row, column.accessor)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, rowIdx) => (
          <div
            key={rowIdx}
            onClick={() => onRowClick?.(row)}
            className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${onRowClick ? 'active:bg-gray-50' : ''}`}
          >
            {columns.map((column, colIdx) => (
              <div key={colIdx} className="mb-2 last:mb-0">
                <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                  {column.mobileLabel || column.header}
                </div>
                <div className="text-sm text-gray-900">
                  {getValue(row, column.accessor)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export function ResponsiveGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
  }[cols] || 'md:grid-cols-4';

  return (
    <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
      {children}
    </div>
  );
}
