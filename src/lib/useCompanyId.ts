"use client";
import { useEffect, useState } from 'react'

export function useCompanyId(initial?: string | null): string | null {
  const [cid, setCid] = useState<string | null>(initial ?? null)
  useEffect(() => {
    if (cid) return
    try {
      const v = localStorage.getItem('company_id')
      if (v) setCid(v)
    } catch {}
  }, [cid])
  return cid
}

export default useCompanyId