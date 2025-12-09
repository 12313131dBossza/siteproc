'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface WhiteLabelConfig {
  enabled: boolean
  logoUrl: string | null
  companyName: string | null
  useEmailName: boolean
  plan: string
}

interface WhiteLabelContextType {
  config: WhiteLabelConfig
  loading: boolean
  isEnterprise: boolean
  canUseWhiteLabel: boolean
  // Computed values for easy access
  displayName: string
  logoUrl: string | null
  // Update function
  updateConfig: (newConfig: Partial<WhiteLabelConfig>) => void
  refresh: () => Promise<void>
}

const defaultConfig: WhiteLabelConfig = {
  enabled: false,
  logoUrl: null,
  companyName: null,
  useEmailName: false,
  plan: 'free'
}

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined)

export function WhiteLabelProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)

  const loadWhiteLabelConfig = async () => {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          enabled: data.white_label_enabled || false,
          logoUrl: data.white_label_logo_url || null,
          companyName: data.white_label_company_name || data.name || null,
          useEmailName: data.white_label_email_name || false,
          plan: data.plan || 'free'
        })
      }
    } catch (error) {
      console.error('Failed to load white-label config:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWhiteLabelConfig()
  }, [])

  // Enterprise plan check - $149+ plan
  const isEnterprise = ['enterprise', 'enterprise_plus', 'custom'].includes(config.plan?.toLowerCase() || '')
  
  // Can use white-label only if on Enterprise plan
  const canUseWhiteLabel = isEnterprise

  // Display name: use white-label company name if enabled, otherwise "SiteProc"
  const displayName = (config.enabled && canUseWhiteLabel && config.companyName) 
    ? config.companyName 
    : 'SiteProc'

  // Logo URL: use white-label logo if enabled, otherwise null (use default SiteProc logo)
  const logoUrl = (config.enabled && canUseWhiteLabel && config.logoUrl) 
    ? config.logoUrl 
    : null

  const updateConfig = (newConfig: Partial<WhiteLabelConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }

  const refresh = async () => {
    setLoading(true)
    await loadWhiteLabelConfig()
  }

  return (
    <WhiteLabelContext.Provider value={{
      config,
      loading,
      isEnterprise,
      canUseWhiteLabel,
      displayName,
      logoUrl,
      updateConfig,
      refresh
    }}>
      {children}
    </WhiteLabelContext.Provider>
  )
}

export function useWhiteLabel() {
  const context = useContext(WhiteLabelContext)
  if (context === undefined) {
    throw new Error('useWhiteLabel must be used within a WhiteLabelProvider')
  }
  return context
}

// Hook for getting just the display name
export function useAppName() {
  const { displayName } = useWhiteLabel()
  return displayName
}

// Hook for getting the logo URL
export function useAppLogo() {
  const { logoUrl } = useWhiteLabel()
  return logoUrl
}
