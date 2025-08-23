"use client";
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Very naive mock role store; replace with real auth later
let _role: string | null = null;
export function setMockRole(r: string) { _role = r; }
export function getMockRole() { return _role; }

export function useRoleGuard(required: string) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!_role) return; // allow public until login sets role
    if (required && _role !== required) {
      router.replace('/login?unauthorized=1&next='+encodeURIComponent(pathname||'/'));
    }
  }, [router, pathname, required]);
}
