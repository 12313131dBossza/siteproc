import { Suspense } from 'react'
import CoNewClient from './CoNewClient'

export default function Page() {
  return (
    <Suspense fallback={<div />}> 
      <CoNewClient />
    </Suspense>
  )
}
