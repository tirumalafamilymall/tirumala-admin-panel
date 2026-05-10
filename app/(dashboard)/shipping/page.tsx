'use client'
import { useState, useEffect, useCallback } from 'react'
import { getOrders, getLabel } from '@/lib/api' 
import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'

export default function ShippingPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('CONFIRMED')

  const PER_PAGE = 20

  const loadShippingQueue = useCallback(async () => {
    setLoading(true)
    try {
      // Fetching orders that are in the shipping pipeline
      const res = await getOrders({ 
        page, 
        limit: PER_PAGE,
        status: statusFilter || undefined,
        search: search || undefined
      })
      
      // Filter for orders that have been pushed to Shiprocket
      const shippingOrders = res.orders?.filter((o: any) => o.shiprocket_order_id) || []
      setOrders(shippingOrders)
      setTotal(res.total || 0)
    } catch (e: any) {
      toast("Failed to load shipping queue", "error")
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { loadShippingQueue() }, [loadShippingQueue])

  // Debounced search logic to match Products page
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadShippingQueue() }, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleDownloadLabel = async (order: any) => {
    try {
      toast("Generating labels...", "info")
      const res = await getLabel(order.shiprocket_order_id)
      if (res.label?.label_url) {
        window.open(res.label.label_url, '_blank')
      }
    } catch (e) {
      toast("Failed to download label", "error")
    }
  }

  return (
    <>
      {/* 1. Filter Bar - Same as Products UI */}
      <div className="filter-bar">
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
          <input 
            type="text" 
            placeholder="Search by Order # or Customer..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select className="flt-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="CONFIRMED">Ready to Ship</option>
          <option value="SHIPPED">In Transit</option>
          <option value="DELIVERED">Completed</option>
          <option value="">All Shipments</option>
        </select>
        <div className="ms-auto">
           <div style={{ fontSize: 12, color: 'var(--ink-5)', fontWeight: 500 }}>
             {orders.length} active in this view
           </div>
        </div>
      </div>

      {/* 2. Main Table Card */}
      <div className="card fade-in">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Shiprocket ID</th>
                <th>Status</th>
                <th>Customer & Destination</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={5} />
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-5)' }}>No shipments found in this category.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    {/* Monospace Order ID */}
                    <td>
                      <span className="ord-id" style={{ fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                        {o.order_number}
                      </span>
                    </td>
                    
                    {/* Shiprocket ID with distinctive badge-style */}
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: 11, 
                        color: 'var(--ink-5)', 
                        background: 'var(--cream-2)', 
                        padding: '2px 6px', 
                        borderRadius: 4 
                      }}>
                        {o.shiprocket_order_id}
                      </span>
                    </td>

                    <td><Badge status={o.status} /></td>

                    <td style={{ fontSize: 12.5 }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink-1)' }}>{(o.shipping_address as any)?.name}</div>
                      <div style={{ color: 'var(--ink-5)', fontSize: 11 }}>
                        {(o.shipping_address as any)?.city}, {(o.shipping_address as any)?.state}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => handleDownloadLabel(o)}>
                          📄 Label
                        </button>
                        {o.tracking_url && (
                          <button className="btn btn-sm btn-ghost" onClick={() => window.open(o.tracking_url)}>
                            🚚 Track
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={Math.ceil(total / PER_PAGE)} perPage={PER_PAGE} totalItems={total} onChange={setPage} />
      </div>
    </>
  )
}