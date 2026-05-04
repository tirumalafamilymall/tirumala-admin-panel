'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Badge, SkeletonRows, Pagination } from '@/components/admin/ui'

const MOCK_ORDERS = [
  { id:'TFM-87291', customer:'Priya Sharma',  items:2, amount:1299,  paymentMethod:'ONLINE', paymentStatus:'PAID',   status:'DELIVERED', date:'18 Apr 2026' },
  { id:'TFM-87290', customer:'Ravi Kumar',    items:1, amount:699,   paymentMethod:'ONLINE', paymentStatus:'PAID',   status:'SHIPPED',   date:'17 Apr 2026' },
  { id:'TFM-87289', customer:'Anita Reddy',   items:3, amount:2450,  paymentMethod:'COD',    paymentStatus:'COD',    status:'CONFIRMED', date:'17 Apr 2026' },
  { id:'TFM-87288', customer:'Suresh Babu',   items:1, amount:899,   paymentMethod:'ONLINE', paymentStatus:'UNPAID', status:'PENDING',   date:'16 Apr 2026' },
  { id:'TFM-87287', customer:'Lakshmi Devi',  items:4, amount:3200,  paymentMethod:'ONLINE', paymentStatus:'PAID',   status:'CANCELLED', date:'15 Apr 2026' },
  { id:'TFM-87285', customer:'Kamala Raju',   items:2, amount:1748,  paymentMethod:'ONLINE', paymentStatus:'PAID',   status:'SHIPPED',   date:'14 Apr 2026' },
  { id:'TFM-87280', customer:'Meena Devi',    items:1, amount:449,   paymentMethod:'COD',    paymentStatus:'COD',    status:'DELIVERED', date:'13 Apr 2026' },
  { id:'TFM-87275', customer:'Roja Kumari',   items:2, amount:1050,  paymentMethod:'ONLINE', paymentStatus:'PAID',   status:'DELIVERED', date:'12 Apr 2026' },
]

export default function OrdersPage() {
  const [loading]       = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [payFilter, setPayFilter]       = useState('')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)
  const [perPage, setPerPage]           = useState(20)

  const filtered = MOCK_ORDERS.filter(o => {
    const q = search.toLowerCase()
    const matchQ = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q)
    const matchS = !statusFilter || o.status === statusFilter
    const matchP = !payFilter || o.paymentStatus === payFilter || o.paymentMethod === payFilter
    return matchQ && matchS && matchP
  })

  return (
    <>
      <div className="filter-bar">
        <select className="flt-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="flt-select" value={payFilter} onChange={e => setPayFilter(e.target.value)}>
          <option value="">All Payment</option>
          <option value="PAID">PAID</option>
          <option value="UNPAID">UNPAID</option>
          <option value="COD">COD</option>
        </select>
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search by order number…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="flt-select ms-auto" value={perPage} onChange={e => setPerPage(+e.target.value)}>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th><th>Customer</th><th>Items</th><th>Amount</th>
                <th>Payment</th><th>Status</th><th>Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <SkeletonRows cols={8} />
                : filtered.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--ink-5)' }}>No orders found</td></tr>
                  : filtered.slice((page-1)*perPage, page*perPage).map(o => (
                    <tr key={o.id}>
                      <td><span className="ord-id">{o.id}</span></td>
                      <td style={{ fontWeight:500 }}>{o.customer}</td>
                      <td style={{ color:'var(--ink-4)' }}>{o.items} item{o.items > 1 ? 's' : ''}</td>
                      <td style={{ fontWeight:700 }}>₹{o.amount.toLocaleString('en-IN')}</td>
                      <td>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          <Badge status={o.paymentStatus} />
                          {o.paymentMethod === 'COD' && <Badge status="COD" />}
                        </div>
                      </td>
                      <td><Badge status={o.status} /></td>
                      <td style={{ fontSize:11.5, color:'var(--ink-5)', whiteSpace:'nowrap' }}>{o.date}</td>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} className="btn btn-sm">View →</Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={Math.ceil(filtered.length/perPage)} perPage={perPage} totalItems={filtered.length} onChange={setPage} />
      </div>
    </>
  )
}
