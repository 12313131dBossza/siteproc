'use client'

interface QuickFilter {
  label: string
  value: string
  count?: number
}

interface QuickFiltersProps {
  filters: QuickFilter[]
  activeFilter?: string
  onFilterClick: (value: string) => void
}

export default function QuickFilters({ filters, activeFilter, onFilterClick }: QuickFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterClick(filter.value)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeFilter === filter.value
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filter.label}
          {filter.count !== undefined && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeFilter === filter.value
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}>
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
