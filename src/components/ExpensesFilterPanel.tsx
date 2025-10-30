"use client";

import { useState } from "react";
import FilterPanel from "@/components/FilterPanel";
import FilterChip from "@/components/FilterChip";
import QuickFilters from "@/components/QuickFilters";
import { useFilters } from "@/hooks/useFilters";
import { Button } from "@/components/ui/Button";
import { Filter, Save, X } from "lucide-react";
import { toast } from "sonner";

interface ExpensesFilterPanelProps {
  onFiltersChange: (filters: any) => void;
}

export function ExpensesFilterPanel({ onFiltersChange }: ExpensesFilterPanelProps) {
  const {
    filters,
    savedFilters,
    applyFilter,
    removeFilter,
    clearFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    updateURL,
    activeFilterCount,
    isFilterActive
  } = useFilters('expenses');

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Quick filter presets
  const quickFilters = [
    { label: 'All Expenses', value: 'all' },
    { label: 'Pending Approval', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Missing Receipts', value: 'missing-receipts' },
    { label: 'This Month', value: 'this-month' },
  ];

  const handleApplyFilter = (key: string, value: any) => {
    applyFilter(key, value);
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleRemoveFilter = (key: string) => {
    removeFilter(key);
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    clearFilters();
    onFiltersChange({});
  };

  const handleApplyFilters = () => {
    updateURL();
    setShowFilterPanel(false);
    onFiltersChange(filters);
  };

  const handleQuickFilter = (value: string) => {
    clearFilters();
    
    if (value === 'pending' || value === 'approved' || value === 'rejected') {
      applyFilter('status', value);
      onFiltersChange({ status: value });
    } else if (value === 'missing-receipts') {
      applyFilter('missingReceipts', 'true');
      onFiltersChange({ missingReceipts: 'true' });
    } else if (value === 'this-month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      applyFilter('startDate', startOfMonth);
      applyFilter('endDate', endOfMonth);
      onFiltersChange({ startDate: startOfMonth, endDate: endOfMonth });
    } else {
      onFiltersChange({});
    }
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    const success = await saveFilter(filterName, isDefault);
    if (success) {
      toast.success('Filter saved successfully!');
      setShowSaveModal(false);
      setFilterName('');
      setIsDefault(false);
    } else {
      toast.error('Failed to save filter');
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <QuickFilters
        filters={quickFilters}
        activeFilter={filters.quickFilter || 'all'}
        onFilterClick={handleQuickFilter}
      />

      {/* Filter Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Button */}
          <Button
            variant={activeFilterCount > 0 ? "primary" : "ghost"}
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs font-medium">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Active Filter Chips */}
          {Object.entries(filters).map(([key, value]) => {
            if (key === 'quickFilter') return null;
            
            let label = key;
            let displayValue = value;

            // Format labels
            if (key === 'status') label = 'Status';
            else if (key === 'category') label = 'Category';
            else if (key === 'minAmount') label = 'Min Amount';
            else if (key === 'maxAmount') label = 'Max Amount';
            else if (key === 'startDate') label = 'From';
            else if (key === 'endDate') label = 'To';
            else if (key === 'project_id') label = 'Project';
            else if (key === 'missingReceipts') {
              label = 'Missing Receipts';
              displayValue = 'Yes';
            }

            return (
              <FilterChip
                key={key}
                label={label}
                value={displayValue}
                onRemove={() => handleRemoveFilter(key)}
              />
            );
          })}
        </div>

        {/* Saved Filters Dropdown */}
        {savedFilters.length > 0 && (
          <div className="relative">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => {
                if (e.target.value) {
                  loadFilter(e.target.value);
                  onFiltersChange(savedFilters.find(f => f.id === e.target.value)?.filters || {});
                }
              }}
              value=""
            >
              <option value="">Load Saved Filter...</option>
              {savedFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.name} {filter.is_default ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Save Filter Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => setShowSaveModal(true)}
          >
            Save Filter
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        title="Expense Filters"
        onClear={handleClearAll}
        onApply={handleApplyFilters}
      >
        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleApplyFilter('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleApplyFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="labor">Labor</option>
              <option value="materials">Materials</option>
              <option value="equipment">Equipment</option>
              <option value="rentals">Rentals</option>
              <option value="transportation">Transportation</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleApplyFilter('startDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleApplyFilter('endDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Amount Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={filters.minAmount || ''}
                onChange={(e) => handleApplyFilter('minAmount', e.target.value)}
                placeholder="Min"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                value={filters.maxAmount || ''}
                onChange={(e) => handleApplyFilter('maxAmount', e.target.value)}
                placeholder="Max"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Missing Receipts Toggle */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.missingReceipts === 'true'}
                onChange={(e) => handleApplyFilter('missingReceipts', e.target.checked ? 'true' : '')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Only show expenses missing receipts</span>
            </label>
          </div>
        </div>
      </FilterPanel>

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSaveModal(false);
              setFilterName('');
              setIsDefault(false);
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Save Filter</h3>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setFilterName('');
                  setIsDefault(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter Name
                </label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="e.g., Pending Expenses This Month"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is-default" className="text-sm text-gray-700">
                  Set as default filter
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSaveModal(false);
                  setFilterName('');
                  setIsDefault(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveFilter}
                className="flex-1"
              >
                Save Filter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
