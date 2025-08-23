import { Suspense } from 'react'
import NewRFQClient from './NewRFQClient'

export default function Page() {
  return (
    <Suspense fallback={<div />}> 
      <NewRFQClient />
    </Suspense>
  )
}
