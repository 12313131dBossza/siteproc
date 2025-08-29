'use client'

export function useToast() {
  // never throw; just log if someone calls it
  return { toast: console.log };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // no provider logic; just render children
  return <>{children}</>;
}

export default function ToasterShim() {
  // render nothing
  return null;
}
