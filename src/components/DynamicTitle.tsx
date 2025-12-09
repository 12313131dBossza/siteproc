'use client'

import { useEffect } from 'react'
import { useWhiteLabel } from '@/lib/WhiteLabelContext'

/**
 * DynamicTitle component updates the document title based on white-label settings
 * When white-label is enabled for Enterprise customers, shows their company name
 * Otherwise shows "SiteProc"
 */
export function DynamicTitle() {
  const { displayName, loading } = useWhiteLabel()

  useEffect(() => {
    if (!loading) {
      document.title = displayName
    }
  }, [displayName, loading])

  return null
}

/**
 * Hook to set page-specific title with white-label support
 * Usage: usePageTitle('Dashboard') -> "Dashboard | Acme Builders" or "Dashboard | SiteProc"
 */
export function usePageTitle(pageTitle?: string) {
  const { displayName, loading } = useWhiteLabel()

  useEffect(() => {
    if (!loading) {
      if (pageTitle) {
        document.title = `${pageTitle} | ${displayName}`
      } else {
        document.title = displayName
      }
    }
  }, [pageTitle, displayName, loading])
}
