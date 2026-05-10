'use client'
import { useEffect, useState } from 'react'
import { getDashboard } from '@/lib/api'
import { Badge, StockBadge, SkeletonRows, toast } from '@/components/admin/ui'
import Link from 'next/link'

const STATS = [
  { key:'products', label:'Total Products',     icon:'📦', c1:'#C43C3C', c2:'#E87070', bg:'#FEF2F2' },
  { key:'orders',   label:'Total Orders',       icon:'🛍️', c1:'#C4922A', c2:'#E8B030', bg:'#FDF5E0' },
  { key:'revenue',  label:'Revenue',            icon:'💰', c1:'#1A7A42', c2:'#2EA05A', bg:'#E8F7EE' },
  { key:'users',    label:'Customers',          icon:'👥', c1:'#1A4A8A', c2:'#3070C0', bg:'#E8EFF9' },
]

export default function DashboardPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(res => setData(res))
      .catch(() => toast('Could not load dashboard data', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const stats = data?.stats ?? {}

  return (
    <>
      {/* STAT CARDS */}
      <div className="stats-grid">
        {STATS.map(s => (
          <div className="stat-card" key={s.key}>
            <div className="stat-card-stripe" style={{ background: `linear-gradient(90deg, ${s.c1}, ${s.c2})` }} />
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">
              {/* Using dynamic bracket notation: stats['revenue']?.total */}
              {loading ? '—' : s.key === 'revenue'
                ? `₹${Number(stats[s.key]?.total ?? 0).toLocaleString('en-IN')}`
                : String(stats[s.key]?.total ?? 0)}
            </div>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders - Spanning full width now */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Orders</div>
            <div className="card-subtitle">Latest transactions</div>
          </div>
          <Link href="/admin/orders" className="card-action">View all →</Link>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {/* CORRECT PATH: data.stats.recent_orders */}
              {loading ? <SkeletonRows cols={5} /> : (data?.stats?.recent_orders ?? []).map((o: any) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="ord-id">{o.order_number}</Link></td>
                  <td style={{ fontWeight: 500 }}>{o.user?.name ?? '—'}</td>
                  <td style={{ fontWeight: 700 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                  <td><Badge status={o.payment_status} /></td>
                  <td><Badge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}