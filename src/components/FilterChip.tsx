'use client'

import { X } from 'lucide-react'

interface FilterChipProps {
  label: string
  value: string | number
  onRemove: () => void
}

export default function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
      <span className="font-normal text-blue-600">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
