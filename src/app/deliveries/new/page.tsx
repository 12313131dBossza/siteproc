import { Suspense } from 'react'
import DeliveryNewClient from './DeliveryNewClient'

export default function Page() {
  return (
    <Suspense fallback={<div />}> 
      <DeliveryNewClient />
    </Suspense>
  )
}
