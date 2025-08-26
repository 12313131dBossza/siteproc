"use client";
import dynamicImport from 'next/dynamic'
// Force dynamic rendering to always fetch fresh data server-side for its child client component.
export const dynamic = 'force-dynamic'
// In a Client Component file, using ssr:false is unnecessary; we can just dynamically import.
const C = dynamicImport(()=>import('./pageClient'))
export default function Page(){
	return <C />
}
