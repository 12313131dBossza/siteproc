'use client'

import { ReactNode } from 'react'
import { X, Filter } from 'lucide-react'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  onClear?: () => void
  onApply?: () => void
}

export default function FilterPanel({
  isOpen,
  onClose,
  children,
  title = 'Filters',
  onClear,
  onApply
}: FilterPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Filter Panel */}
      <div className={`
        fixed md:relative top-0 right-0 h-full md:h-auto
        w-80 bg-white border-l md:border md:rounded-lg shadow-xl
        z-50 md:z-auto
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 md:hidden"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] md:max-h-96">
          {children}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center gap-3">
          {onClear && (
            <button
              onClick={onClear}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Clear All
            </button>
          )}
          {onApply && (
            <button
              onClick={onApply}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Apply Filters
            </button>
          )}
        </div>
      </div>
    </>
  )
}
