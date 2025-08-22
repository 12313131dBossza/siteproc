import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { supabaseService } from '@/lib/supabase'

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12 },
  h1: { fontSize: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  section: { marginTop: 12, marginBottom: 8 },
  label: { color: '#555' },
  value: { fontWeight: 'bold' },
  twoCol: { flexDirection: 'row', gap: 24 },
  col: { flexGrow: 1 },
  table: { marginTop: 12, borderTop: '1px solid #000', borderBottom: '1px solid #000' },
  tr: { flexDirection: 'row', paddingVertical: 6, borderBottom: '1px solid #ddd' },
  th: { flex: 1, fontWeight: 'bold' },
  td: { flex: 1 },
})

export async function renderPOPdf(poId: string): Promise<Buffer> {
  const sb = supabaseService()

  // Load PO and related records (supplier, job, quote, rfq, company)
  const { data: po } = await sb.from('pos').select('*').eq('id', poId).single()
  if (!po) {
    // Minimal fallback document when PO not found
    const fallback = (
      <Document>
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.h1}>Purchase Order</Text>
          <Text>PO not found: {poId}</Text>
        </Page>
      </Document>
    )
    const inst = pdf(fallback)
    const b = await inst.toBuffer()
    return b as unknown as Buffer
  }

  const [supplierRes, jobRes, quoteRes, rfqRes, companyRes, itemsRes] = await Promise.all([
    po.supplier_id
      ? sb.from('suppliers').select('name,email,phone').eq('id', po.supplier_id).single()
      : Promise.resolve({ data: null } as any),
    po.job_id
      ? sb.from('jobs').select('name,code').eq('id', po.job_id).single()
      : Promise.resolve({ data: null } as any),
    po.quote_id
      ? sb.from('quotes').select('lead_time,terms,total').eq('id', po.quote_id).single()
      : Promise.resolve({ data: null } as any),
    po.rfq_id
      ? sb.from('rfqs').select('needed_date').eq('id', po.rfq_id).single()
      : Promise.resolve({ data: null } as any),
    po.company_id
      ? sb.from('companies').select('name').eq('id', po.company_id).single()
      : Promise.resolve({ data: null } as any),
    po.rfq_id
      ? sb.from('rfq_items').select('description,qty,unit,sku').eq('rfq_id', po.rfq_id)
      : Promise.resolve({ data: [] } as any),
  ])

  const supplier = (supplierRes as any).data as { name?: string; email?: string; phone?: string } | null
  const job = (jobRes as any).data as { name?: string; code?: string } | null
  const quote = (quoteRes as any).data as { lead_time?: string; terms?: string; total?: number | null } | null
  const rfq = (rfqRes as any).data as { needed_date?: string | null } | null
  const company = (companyRes as any).data as { name?: string } | null
  const items = (itemsRes as any).data as Array<{ description: string; qty: number; unit?: string; sku?: string }>

  const fmtMoney = (n?: number | null) => (typeof n === 'number' ? `$${n.toFixed(2)}` : '-')
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '-')

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.row}>
          <Text style={styles.h1}>Purchase Order</Text>
          <View>
            <Text style={{ textAlign: 'right' }}>{po.po_number}</Text>
            <Text style={{ textAlign: 'right' }}>{po.status}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>Company</Text>
            <Text style={styles.value}>{company?.name || '-'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>PO Date</Text>
            <Text style={styles.value}>{fmtDate(po.created_at)}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>Supplier</Text>
            <Text style={styles.value}>{supplier?.name || '-'}</Text>
            {supplier?.email ? <Text>{supplier.email}</Text> : null}
            {supplier?.phone ? <Text>{supplier.phone}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Job</Text>
            <Text style={styles.value}>{job?.name || '-'}</Text>
            {job?.code ? <Text>Code: {job.code}</Text> : null}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.label}>Needed By</Text>
            <Text style={styles.value}>{fmtDate(rfq?.needed_date ?? null)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{fmtMoney(po.total ?? quote?.total ?? null)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Terms</Text>
          <Text>{quote?.terms || '-'}</Text>
        </View>
        <View style={{ marginTop: 6 }}>
          <Text style={styles.label}>Lead Time</Text>
          <Text>{quote?.lead_time || '-'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Items</Text>
          {items?.length ? (
            <View style={styles.table}>
              <View style={[styles.tr, { borderBottom: '1px solid #000' }]}>
                <Text style={[styles.th, { flex: 4 }]}>Description</Text>
                <Text style={[styles.th, { flex: 1 }]}>Qty</Text>
                <Text style={[styles.th, { flex: 1 }]}>Unit</Text>
                <Text style={[styles.th, { flex: 2 }]}>SKU</Text>
              </View>
              {items.map((it, idx) => (
                <View key={idx} style={styles.tr}>
                  <Text style={{ flex: 4 }}>{it.description}</Text>
                  <Text style={{ flex: 1 }}>{String(it.qty)}</Text>
                  <Text style={{ flex: 1 }}>{it.unit || ''}</Text>
                  <Text style={{ flex: 2 }}>{it.sku || ''}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text>-</Text>
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text>Thank you for your business.</Text>
        </View>
      </Page>
    </Document>
  )

  const instance = pdf(doc)
  // @react-pdf/renderer on Node returns a Buffer from toBuffer()
  const buf = await instance.toBuffer()
  return buf as unknown as Buffer
}
