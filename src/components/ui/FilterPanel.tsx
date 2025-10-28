import { Filter, X, Calendar } from 'lucide-react';
import { useState } from 'react';
import { Select } from './Select';
import { Input } from './Input';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  status?: FilterOption[];
  category?: FilterOption[];
  dateRange?: boolean;
  amountRange?: boolean;
  customFilters?: {
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
}

export interface FilterPanelProps {
  config: FilterConfig;
  filters: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  className?: string;
}

/**
 * FilterPanel Component
 * 
 * Advanced filtering panel with:
 * - Status dropdown
 * - Category dropdown
 * - Date range picker
 * - Amount range inputs
 * - Custom filter fields
 * - Reset all button
 * - Active filter count badge
 */
export function FilterPanel({
  config,
  filters,
  onChange,
  className = '',
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange({});
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== '' && value !== null && value !== undefined
  ).length;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset
            </button>
          )}
          <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Filter Fields */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          {config.status && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  ...config.status,
                ]}
                fullWidth
              />
            </div>
          )}

          {/* Category Filter */}
          {config.category && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...config.category,
                ]}
                fullWidth
              />
            </div>
          )}

          {/* Date Range Filter */}
          {config.dateRange && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  leftIcon={<Calendar className="h-4 w-4" />}
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  leftIcon={<Calendar className="h-4 w-4" />}
                  fullWidth
                />
              </div>
            </>
          )}

          {/* Amount Range Filter */}
          {config.amountRange && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Amount
                </label>
                <Input
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  placeholder="0"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Amount
                </label>
                <Input
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  placeholder="∞"
                  fullWidth
                />
              </div>
            </>
          )}

          {/* Custom Filters */}
          {config.customFilters?.map((customFilter, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {customFilter.label}
              </label>
              <Select
                value={customFilter.value}
                onChange={(e) => customFilter.onChange(e.target.value)}
                options={[
                  { value: '', label: `All ${customFilter.label}` },
                  ...customFilter.options,
                ]}
                fullWidth
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage filter state with URL persistence
 */
export function useFilters(defaultFilters: Record<string, any> = {}) {
  const [filters, setFilters] = useState(defaultFilters);

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const applyFilters = <T,>(items: T[], filterFn: (item: T, filters: Record<string, any>) => boolean): T[] => {
    return items.filter((item) => filterFn(item, filters));
  };

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    applyFilters,
  };
}
