"use client";
import dynamicImport from 'next/dynamic'
export const dynamic = 'force-dynamic'
const C = dynamicImport(()=>import('./pageClient'))
export default function Page(){
	return <C />
}
