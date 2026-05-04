'use client'
import { useEffect, useState } from 'react'
import { getDashboard } from '@/lib/api'
import { Badge, StockBadge, SkeletonRows } from '@/components/admin/ui'
import { toast } from '@/components/admin/ui'
import Link from 'next/link'

const MOCK = {
  stats: { products: 1240, orders: 340, users: 890, revenue: '₹2.8L' },
  recentOrders: [
    { id:'TFM-87291', customer:'Priya Reddy', amount:'₹1,299', status:'DELIVERED', date:'18 Apr 2026', payment:'PAID' },
    { id:'TFM-87290', customer:'Ravi Kumar',  amount:'₹699',   status:'SHIPPED',   date:'17 Apr 2026', payment:'PAID' },
    { id:'TFM-87289', customer:'Anita Reddy', amount:'₹2,450', status:'CONFIRMED', date:'17 Apr 2026', payment:'COD' },
    { id:'TFM-87288', customer:'Suresh Babu', amount:'₹899',   status:'PENDING',   date:'16 Apr 2026', payment:'UNPAID' },
    { id:'TFM-87287', customer:'Lakshmi D.',  amount:'₹3,200', status:'CANCELLED', date:'15 Apr 2026', payment:'PAID' },
  ],
  lowStock: [
    { name:'Silk Blend Saree (Red)',   category:'Sarees · Women',   stock:0 },
    { name:'Cotton Kurti Set (Blue)',  category:'Kurtis · Women',   stock:3 },
    { name:'Kids Frock (Yellow)',      category:'Frocks · Kids',    stock:2 },
    { name:"Men's Linen Shirt (White)",'category':'Shirts · Men',  stock:0 },
    { name:'Cotton Nightie (Pink XL)', category:'Nightwear · Women',stock:4 },
    { name:'Embroidered Dupatta',      category:'Accessories',      stock:1 },
    { name:'Girls Lehenga (Blue)',     category:'Kids Wear',        stock:5 },
  ],
}

const STATS = [
  { key:'products', label:'Total Products', icon:'📦', delta:'↑ 42 this month', dir:'up', c1:'#C43C3C', c2:'#E87070', bg:'#FEF2F2' },
  { key:'orders',   label:'Total Orders',   icon:'🛍️', delta:'↑ 18% this week', dir:'up', c1:'#C4922A', c2:'#E8B030', bg:'#FDF5E0' },
  { key:'revenue',  label:'Revenue',        icon:'💰', delta:'↑ 23% this month', dir:'up', c1:'#1A7A42', c2:'#2EA05A', bg:'#E8F7EE' },
  { key:'users',    label:'Customers',      icon:'👥', delta:'↑ 56 new users',   dir:'up', c1:'#1A4A8A', c2:'#3070C0', bg:'#E8EFF9' },
]

export default function DashboardPage() {
  const [data, setData] = useState<any>(MOCK)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // getDashboard().then(setData).catch(() => toast('Could not load dashboard data', 'error'))
    // Using mock for demo. Swap getDashboard() in production.
    setLoading(false)
  }, [])

  const stats = [
    data.stats?.products ?? MOCK.stats.products,
    data.stats?.orders   ?? MOCK.stats.orders,
    data.stats?.revenue  ?? MOCK.stats.revenue,
    data.stats?.users    ?? MOCK.stats.users,
  ]

  return (
    <>
      {/* ── STAT CARDS ── */}
      <div className="stats-grid">
        {STATS.map((s, i) => (
          <div className="stat-card" key={s.key}>
            <div className="stat-card-stripe" style={{ background: `linear-gradient(90deg, ${s.c1}, ${s.c2})` }} />
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{loading ? '—' : String(stats[i]).toLocaleString()}</div>
            <div className={`stat-delta ${s.dir}`}>
              {s.dir === 'up'
                ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 10V2M2 6l4-4 4 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                : <svg width="11" height="11" viewBox="0 0 12 12"><path d="M6 2v8M2 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
              {s.delta}
            </div>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* ── TWO COLUMN ── */}
      <div className="two-col">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Orders</div>
              <div className="card-subtitle">Latest 5 transactions</div>
            </div>
            <Link href="/admin/orders" className="card-action">View all →</Link>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <SkeletonRows cols={5} />
                  : (data.recentOrders || MOCK.recentOrders).map((o: any) => (
                    <tr key={o.id}>
                      <td><Link href={`/admin/orders/${o.id}`} className="ord-id">{o.id}</Link></td>
                      <td style={{ fontWeight: 500 }}>{o.customer}</td>
                      <td style={{ fontWeight: 700 }}>{o.amount}</td>
                      <td><Badge status={o.payment} /></td>
                      <td><Badge status={o.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Low Stock Alert</div>
              <div className="card-subtitle" style={{ color: 'var(--red)' }}>Needs restocking</div>
            </div>
            <Link href="/admin/products" className="card-action">Manage →</Link>
          </div>
          {loading
            ? <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 200 }} /></div>
            : (data.lowStock || MOCK.lowStock).map((p: any, i: number) => (
              <div className="low-stock-row" key={i}>
                <div>
                  <div className="low-stock-name">{p.name}</div>
                  <div className="low-stock-cat">{p.category}</div>
                </div>
                <StockBadge stock={p.stock} />
              </div>
            ))}
        </div>
      </div>

      {/* ── QUICK STATS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        {[
          { label:'Orders Today', val:'24', icon:'📋' },
          { label:'Revenue Today', val:'₹18,400', icon:'💳' },
          { label:'Pending Shipments', val:'8', icon:'🚚' },
          { label:'New Users Today', val:'12', icon:'🧑' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 28, width: 46, height: 46, borderRadius: 11, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-5)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
