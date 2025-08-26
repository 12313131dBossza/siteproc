import { createContext } from 'react'

// Shared (server + client) settings context. Server layout provides the value; client components consume via hook.
export const SettingsContext = createContext<any>(null)
