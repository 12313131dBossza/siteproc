"use client";

import { useState } from "react";
import FilterPanel from "@/components/FilterPanel";
import FilterChip from "@/components/FilterChip";
import QuickFilters from "@/components/QuickFilters";
import { useFilters } from "@/hooks/useFilters";
import { Button } from "@/components/ui/Button";
import { Filter, Save, X } from "lucide-react";
import { toast } from "sonner";

interface ProductsFilterPanelProps {
  onFiltersChange: (filters: any) => void;
}

export function ProductsFilterPanel({ onFiltersChange }: ProductsFilterPanelProps) {
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
  } = useFilters('products');

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Quick filter presets
  const quickFilters = [
    { label: 'All Products', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Low Stock', value: 'low-stock' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Out of Stock', value: 'out-of-stock' },
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
    
    if (value === 'active' || value === 'inactive' || value === 'discontinued') {
      applyFilter('status', value);
      onFiltersChange({ status: value });
    } else if (value === 'low-stock') {
      applyFilter('stockStatus', 'low');
      onFiltersChange({ stockStatus: 'low' });
    } else if (value === 'out-of-stock') {
      applyFilter('stockStatus', 'out');
      onFiltersChange({ stockStatus: 'out' });
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
            else if (key === 'supplier') label = 'Supplier';
            else if (key === 'stockStatus') {
              label = 'Stock Status';
              if (value === 'low') displayValue = 'Low Stock';
              else if (value === 'out') displayValue = 'Out of Stock';
              else if (value === 'in') displayValue = 'In Stock';
            }
            else if (key === 'minPrice') label = 'Min Price';
            else if (key === 'maxPrice') label = 'Max Price';

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
        title="Product Filters"
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={filters.category || ''}
              onChange={(e) => handleApplyFilter('category', e.target.value)}
              placeholder="Search by category..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Supplier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <input
              type="text"
              value={filters.supplier || ''}
              onChange={(e) => handleApplyFilter('supplier', e.target.value)}
              placeholder="Search by supplier name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={filters.minPrice || ''}
                onChange={(e) => handleApplyFilter('minPrice', e.target.value)}
                placeholder="Min"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => handleApplyFilter('maxPrice', e.target.value)}
                placeholder="Max"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Stock Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Status
            </label>
            <select
              value={filters.stockStatus || ''}
              onChange={(e) => handleApplyFilter('stockStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Stock Levels</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
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
                  placeholder="e.g., Active Products - Low Stock"
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
