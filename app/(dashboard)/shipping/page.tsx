'use client'
import { useState, useEffect } from 'react'
// 1. Change the import at the top
import { getOrders, getLabel } from '@/lib/api' 


import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'

export default function ShippingPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Fetch orders that are in a shipping-related state
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // We filter for orders that are likely in the shipping pipeline
        const res = await getOrders({ page, status: 'CONFIRMED' }) // Or SHIPPED
        const shippingOrders = res.orders?.filter((o: any) => o.shiprocket_order_id) || []
        setOrders(shippingOrders)
      } catch (e: any) {
        toast("Failed to load shipping queue", "error")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page])

// 2. Update the function call inside the page
const handleDownloadLabel = async (order: any) => {
  try {
    toast("Generating labels...", "info")
    // Use getLabel instead of downloadLabel
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
      <div className="section-header">
        <div style={{ fontSize: 13, color: 'var(--ink-5)' }}>
          Active Shipments: {orders.length} in queue
        </div>
      </div>

      <div className="card fade-in">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Shiprocket ID</th>
                <th>Status</th>
                <th>Destination</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={5} />
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>No active shipments found.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td><span className="ord-id">{o.order_number}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.shiprocket_order_id}</td>
                    <td><Badge status={o.status} /></td>
                    <td style={{ fontSize: 12 }}>
                      {/* Safe access to JSON address */}
                      {(o.shipping_address as any)?.city}, {(o.shipping_address as any)?.state}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-xs" onClick={() => handleDownloadLabel(o)}>
                          📄 Label
                        </button>
                        {o.tracking_url && (
                          <button className="btn btn-xs btn-ghost" onClick={() => window.open(o.tracking_url)}>
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
      </div>
    </>
  )
}