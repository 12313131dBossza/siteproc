'use client'
import { Toaster } from 'sonner'
export default function ToasterShim() { return <Toaster richColors closeButton /> }
export function ToastProvider({ children }: { children: React.ReactNode }) { return <>{children}</> }
