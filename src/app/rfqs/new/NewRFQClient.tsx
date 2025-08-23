"use client"
import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useSearchParams } from 'next/navigation'

export default function NewRFQClient() {
  const sp = useSearchParams()
  const [msg, setMsg] = useState('')
  const [companyId, setCompanyId] = useState<string>(process.env.NEXT_PUBLIC_COMPANY_ID || '')
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const { register, control, handleSubmit, setValue } = useForm({
    defaultValues: { job_id: '', title: '', needed_date: '', items: [{ description: '', qty: 1, unit: '', sku: '' }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    const j = sp.get('job') || (typeof window !== 'undefined' ? localStorage.getItem('job_id') || '' : '')
    if (j) setValue('job_id', j)
    if (!companyId && typeof window !== 'undefined') {
      const cid = localStorage.getItem('company_id') || ''
      if (cid) setCompanyId(cid)
    }
  }, [sp, setValue, companyId])

  const onSubmit = async (values: any) => {
    setMsg('')
    if (!uuidRe.test(values.job_id)) {
      setMsg('Error: Job ID must be a valid UUID (see Home to seed a demo job).')
      return
    }
    const res = await fetch('/api/rfqs', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-company-id': companyId || (typeof window !== 'undefined' ? localStorage.getItem('company_id') || '' : '') },
      body: JSON.stringify(values),
    })
    let data: any = null
    if (res.headers.get('content-type')?.includes('application/json')) {
      try { data = await res.json() } catch { /* ignore */ }
    } else {
      try { data = { error: await res.text() } } catch { /* ignore */ }
    }
    if (res.ok && data?.id) setMsg(`Created RFQ ${data.id}`)
    else setMsg(`Error: ${data?.error || res.statusText || 'Request failed'}`)
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-3">New RFQ</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <label className="block">Job ID<input className="border p-2 w-full" {...register('job_id')} placeholder="uuid"/></label>
        <label className="block">Title<input className="border p-2 w-full" {...register('title')} /></label>
        <label className="block">Needed Date<input className="border p-2 w-full" type="date" {...register('needed_date')} /></label>
        <div>
          <div className="font-medium mb-2">Items</div>
          {fields.map((f, idx) => (
            <div key={f.id} className="grid grid-cols-5 gap-2 mb-2">
              <input className="border p-2 col-span-2" placeholder="Description" {...register(`items.${idx}.description`)} />
              <input className="border p-2" type="number" step="0.01" placeholder="Qty" {...register(`items.${idx}.qty`, { valueAsNumber: true })} />
              <input className="border p-2" placeholder="Unit" {...register(`items.${idx}.unit`)} />
              <input className="border p-2" placeholder="SKU" {...register(`items.${idx}.sku`)} />
              <button type="button" className="col-span-5 text-red-600 text-sm" onClick={() => remove(idx)}>Remove</button>
            </div>
          ))}
          <button type="button" className="px-3 py-2 bg-gray-200 rounded" onClick={() => append({ description: '', qty: 1, unit: '', sku: '' })}>+ Add Item</button>
        </div>
        <button className="w-full py-2 bg-black text-white rounded">Create RFQ</button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  )
}
