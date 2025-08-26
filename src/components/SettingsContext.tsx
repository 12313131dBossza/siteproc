"use client";
import { createContext, useContext, type ReactNode } from 'react'

const SettingsCtx = createContext<any>(null)

export function SettingsContextProvider({ value, children }: { value: any; children: ReactNode }) {
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettingsContext() { return useContext(SettingsCtx) }
