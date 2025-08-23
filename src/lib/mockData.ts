// Mock data for admin tables
export interface Project { id: string; name: string; status: string; client: string; startDate: string; endDate?: string; budget: number; }
export interface Delivery { id: string; project: string; status: string; eta: string; by: string; }
export interface Expense { id: string; project: string; category: string; amount: number; date: string; }
export interface ChangeOrder { id: string; project: string; status: string; amountDelta: number; submitted: string; }
export interface Bid { id: string; project: string; contractor: string; amount: number; status: string; submitted: string; }
export interface Invoice { id: string; project: string; amount: number; due: string; status: string; }
export interface Contractor { id: string; name: string; trade: string; rating: number; compliance: { doc: string; status: string; expiry?: string }[] }
export interface Client { id: string; name: string; contact: string; email: string; projects: number }

function daysAgo(n:number) { const d = new Date(Date.now() - n*86400000); return d.toISOString().slice(0,10); }

export const projects: Project[] = [
  { id:'P-1001', name:'Warehouse Expansion', status:'Active', client:'Acme Corp', startDate:daysAgo(30), budget: 250000 },
  { id:'P-1002', name:'Office Renovation', status:'Planning', client:'Globex', startDate:daysAgo(5), budget: 120000 },
  { id:'P-1003', name:'Retail Buildout', status:'Active', client:'Initech', startDate:daysAgo(12), budget: 90000 }
];

export const deliveries: Delivery[] = [
  { id:'D-501', project:'Warehouse Expansion', status:'In Transit', eta:daysAgo(-2), by:'LogiTrans' },
  { id:'D-502', project:'Office Renovation', status:'Pending', eta:daysAgo(3), by:'FreightCo' }
];

export const expenses: Expense[] = [
  { id:'E-700', project:'Warehouse Expansion', category:'Materials', amount: 5200, date:daysAgo(1) },
  { id:'E-701', project:'Retail Buildout', category:'Labor', amount: 3100, date:daysAgo(2) }
];

export const changeOrders: ChangeOrder[] = [
  { id:'C-201', project:'Warehouse Expansion', status:'Pending', amountDelta: 15000, submitted:daysAgo(2) }
];

export const bids: Bid[] = [
  { id:'B-900', project:'Office Renovation', contractor:'BuildRight', amount: 115000, status:'Pending', submitted:daysAgo(1) },
  { id:'B-901', project:'Office Renovation', contractor:'PrimeConstruct', amount: 118500, status:'Pending', submitted:daysAgo(1) }
];

export const invoices: Invoice[] = [
  { id:'INV-1', project:'Warehouse Expansion', amount: 48000, due:daysAgo(7), status:'Unpaid' },
  { id:'INV-2', project:'Retail Buildout', amount: 15000, due:daysAgo(-10), status:'Paid' }
];

export const contractors: Contractor[] = [
  { id:'CTR-1', name:'BuildRight', trade:'General', rating:4.6, compliance:[
    { doc:'License', status:'Valid', expiry: daysAgo(200) },
    { doc:'Insurance', status:'Expiring', expiry: daysAgo(-25) },
    { doc:'W-9', status:'Valid' }
  ]},
  { id:'CTR-2', name:'PrimeConstruct', trade:'Electrical', rating:4.3, compliance:[
    { doc:'License', status:'Valid', expiry: daysAgo(300) },
    { doc:'Insurance', status:'Valid' }
  ]}
];

export const clients: Client[] = [
  { id:'CL-1', name:'Acme Corp', contact:'Sarah Lee', email:'sarah@acme.com', projects:2 },
  { id:'CL-2', name:'Globex', contact:'Liam Chen', email:'liam@globex.com', projects:1 }
];

export const recentActivity = [
  { time: daysAgo(0)+' 09:22', entity:'Delivery D-501', action:'Checked In', by:'system' },
  { time: daysAgo(0)+' 08:14', entity:'Change Order C-201', action:'Submitted', by:'jane@siteproc' },
  { time: daysAgo(1)+' 16:02', entity:'Expense E-700', action:'Added', by:'john@siteproc' }
];

export const openItems = [
  { type:'Change Order', project:'Warehouse Expansion', due: daysAgo(3), status:'Pending Review', action:'Review' },
  { type:'Delivery', project:'Office Renovation', due: daysAgo(-1), status:'Overdue', action:'Check In' }
];
