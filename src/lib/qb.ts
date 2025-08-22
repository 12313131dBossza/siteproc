import Papa from 'papaparse'

type AnyRow = Record<string, any>

export function expensesCsv(rows: AnyRow[]) {
  // Minimal QuickBooks Expenses headers
  const header = [
    'Date',
    'Vendor',
    'Account',
    'Amount',
    'Memo',
  ]
  const data = rows.map((r) => [r.spent_at, r.supplier_name || '', r.cost_code || '', r.amount, r.memo || ''])
  return Papa.unparse({ fields: header, data })
}

export function billsCsv(rows: AnyRow[]) {
  // Minimal QuickBooks Bills headers
  const header = [
    'Bill Date',
    'Vendor',
    'Bill No',
    'Amount',
  ]
  const data = rows.map((r) => [r.created_at?.slice(0, 10) || '', r.supplier_name || '', r.po_number || '', r.total || 0])
  return Papa.unparse({ fields: header, data })
}
