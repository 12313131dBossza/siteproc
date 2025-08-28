'use client'
import { toast as sonnerToast } from 'sonner'

export function useToast() {
	return { toast: sonnerToast }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	return <>{children}</>
}

export default function ToasterShim() {
	return null
}
