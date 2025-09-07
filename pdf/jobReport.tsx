import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { supabaseService } from '@/lib/supabase'
import { JobKpis } from '@/lib/kpi'

const styles = StyleSheet.create({ page: { padding: 24, fontSize: 12 }, h1: { fontSize: 18, marginBottom: 8 }, section: { marginTop: 12 } })

export async function renderJobReport(jobId: string, kpis?: JobKpis): Promise<Buffer> {
  const sb = supabaseService()
  const [{ data: job }, { data: pos }, { data: deliveries }, { data: cos }] = await Promise.all([
    (sb as any).from('jobs').select('*').eq('id', jobId).single(),
    (sb as any).from('pos').select('id,po_number,total,status').eq('job_id', jobId),
    (sb as any).from('deliveries').select('id,status,delivered_at').eq('job_id', jobId),
    (sb as any).from('change_orders').select('id,status,cost_delta').eq('job_id', jobId),
  ])

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Job Report</Text>
  <Text>Job: {job?.name || jobId || 'Unknown Job'}</Text>
        <View style={styles.section}><Text>POs: {pos?.length || 0}</Text></View>
        <View style={styles.section}>
          <Text>Deliveries: {deliveries?.length || 0}</Text>
        </View>
        <View style={styles.section}>
          <Text>Change Orders: {cos?.length || 0}</Text>
        </View>
        {kpis && (
          <View style={styles.section}>
            <Text>RFQ Cycle Count: {kpis.rfq_cycles}</Text>
            <Text>RFQ Cycle Avg (hrs): {kpis.rfq_cycle_time_hours_avg ?? 'n/a'}</Text>
            <Text>RFQ Cycle Median (hrs): {kpis.rfq_cycle_time_hours_median ?? 'n/a'}</Text>
            <Text>On-Time Delivery %: {kpis.on_time_delivery_pct ?? 'n/a'}</Text>
            <Text>Deliveries Considered: {kpis.deliveries_considered}</Text>
          </View>
        )}
      </Page>
    </Document>
  )

  const buf = await pdf(doc).toBuffer()
  return buf as unknown as Buffer
}
