'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Download, ExternalLink, Check } from 'lucide-react'
import { getOrders, getLabel } from '@/lib/api'
import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'

export default function ShippingPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders({
        page,
        limit: PER_PAGE,
        status: statusFilter || undefined,
        search: search || undefined,
      })
      setOrders(res.orders ?? [])
      setTotal(res.total ?? 0)
    } catch (e: any) {
      toast(e.message || 'Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [search])

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)' }}>Logistics Overview</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-5)', marginTop: 4 }}>
          Monitoring automated fulfillment and dispatch
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-search">
          <input type="text" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>


<select className="flt-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
  <option value="">All orders</option>
  <option value="CONFIRMED">Ready to ship</option>
  <option value="SHIPPED">Dispatched</option>
  <option value="DELIVERED">Delivered</option>
</select>


        
        <div style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 12px', background: 'var(--cream-2)', borderRadius: 8 }}>
          {total} active shipments
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Shiprocket ID</th>
                <th>Status</th>
                <th>Deliver to</th>
                <th style={{ textAlign: 'right' }}>Label</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows cols={5} /> : orders.map(o => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.id}`} style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{o.order_number}</Link>
                  </td>
                  <td>
                    {o.shiprocket_order_id ? (
                      <div style={{ fontSize: 11, fontFamily: 'monospace' }}>{o.shiprocket_order_id}</div>
                    ) : <span style={{ color: 'var(--ink-5)', fontSize: 11 }}>—</span>}
                  </td>
                  <td><Badge status={o.status} /></td>
                  <td style={{ fontSize: 12 }}>{o.shipping_address?.name}</td>



<td style={{ textAlign: 'right' }}>
  {o.shiprocket_order_id ? (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
      <button className="btn btn-sm" title="Print Label" onClick={async () => {
        const newTab = window.open('about:blank', '_blank')
        try {
          const res = await getLabel(o.shiprocket_order_id)
          if (res.label?.label_url && newTab) newTab.location.href = res.label.label_url
          else { if (newTab) newTab.close(); throw new Error('Label not available') }
        } catch (e: any) { if (newTab) newTab.close(); toast(e.message, 'error') }
      }}>
        <Download size={12} /> Label
      </button>
      <button className="btn btn-sm" title="Print Manifest" onClick={async () => {
        const newTab = window.open('about:blank', '_blank')
        try {
          const res = await getLabel(o.shiprocket_order_id)
          if (res.manifest?.manifest_url && newTab) newTab.location.href = res.manifest.manifest_url
          else { if (newTab) newTab.close(); throw new Error('Manifest not available') }
        } catch (e: any) { if (newTab) newTab.close(); toast(e.message, 'error') }
      }}>
        <Download size={12} /> Manifest
      </button>
    </div>
  ) : (
    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Pending Auto-Sync</span>
  )}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
                  <Pagination
  page={page}
  total={Math.ceil(total / PER_PAGE)}
  perPage={PER_PAGE}
  totalItems={total}
  onChange={setPage}
/>
      </div>
    </>
  )
}