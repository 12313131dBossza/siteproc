'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getCurrencyInfo, formatCurrency as formatWithCurrency, CurrencyInfo } from './currencies'

interface CurrencyContextType {
  currency: string
  currencyInfo: CurrencyInfo
  formatAmount: (amount: number) => string
  setCurrency: (code: string) => void
  loading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>('USD')
  const [loading, setLoading] = useState(true)

  // Load currency from company settings on mount
  useEffect(() => {
    async function loadCurrency() {
      try {
        const res = await fetch('/api/companies')
        if (res.ok) {
          const data = await res.json()
          if (data.currency) {
            setCurrencyState(data.currency)
          }
        }
      } catch (error) {
        console.error('Failed to load currency setting:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCurrency()
  }, [])

  const currencyInfo = getCurrencyInfo(currency)

  const formatAmount = (amount: number): string => {
    return formatWithCurrency(amount, currency)
  }

  const setCurrency = (code: string) => {
    setCurrencyState(code)
  }

  return (
    <CurrencyContext.Provider value={{ currency, currencyInfo, formatAmount, setCurrency, loading }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

// Hook that returns just the format function for convenience
export function useFormatCurrency() {
  const { formatAmount } = useCurrency()
  return formatAmount
}
