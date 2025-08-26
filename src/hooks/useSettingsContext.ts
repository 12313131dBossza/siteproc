"use client";
import { useContext } from 'react'
import { SettingsContext } from '@/app/settings/context'

export function useSettingsContext() {
  return useContext(SettingsContext)
}
