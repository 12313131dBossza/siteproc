import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export interface FilterState {
  [key: string]: any
}

export function useFilters(module: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<FilterState>({})
  const [savedFilters, setSavedFilters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize filters from URL params
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries())
    if (Object.keys(params).length > 0) {
      setFilters(params)
    }
  }, [searchParams])

  // Fetch saved filters
  const fetchSavedFilters = useCallback(async () => {
    try {
      const res = await fetch(`/api/saved-filters?module=${module}`)
      const data = await res.json()
      if (data.ok) {
        setSavedFilters(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch saved filters:', error)
    }
  }, [module])

  useEffect(() => {
    fetchSavedFilters()
  }, [fetchSavedFilters])

  // Apply a single filter
  const applyFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Remove a single filter
  const removeFilter = useCallback((key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({})
    router.push(window.location.pathname)
  }, [router])

  // Save current filters
  const saveFilter = useCallback(async (name: string, isDefault: boolean = false) => {
    try {
      const res = await fetch('/api/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module,
          name,
          filters,
          is_default: isDefault
        })
      })
      const data = await res.json()
      if (data.ok) {
        await fetchSavedFilters()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to save filter:', error)
      return false
    }
  }, [module, filters, fetchSavedFilters])

  // Load a saved filter
  const loadFilter = useCallback((filterId: string) => {
    const savedFilter = savedFilters.find(f => f.id === filterId)
    if (savedFilter) {
      setFilters(savedFilter.filters)
    }
  }, [savedFilters])

  // Delete a saved filter
  const deleteFilter = useCallback(async (filterId: string) => {
    try {
      const res = await fetch(`/api/saved-filters/${filterId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchSavedFilters()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to delete filter:', error)
      return false
    }
  }, [fetchSavedFilters])

  // Update URL with current filters
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, String(value))
      }
    })
    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.push(newURL)
  }, [filters, router])

  // Get active filter count
  const activeFilterCount = Object.keys(filters).length

  // Check if a filter is active
  const isFilterActive = (key: string) => {
    return filters[key] !== null && filters[key] !== undefined && filters[key] !== ''
  }

  return {
    filters,
    savedFilters,
    loading,
    applyFilter,
    removeFilter,
    clearFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    updateURL,
    activeFilterCount,
    isFilterActive
  }
}
