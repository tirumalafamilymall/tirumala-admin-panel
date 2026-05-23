'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getOrder } from '@/lib/api'
import { Badge, toast } from '@/components/admin/ui'
import { Loader2, ExternalLink, Package, User, CreditCard, MapPin, Truck } from 'lucide-react'

export default function OrderDetailPage() {
  const params  = useParams()
  const orderId = params.id as string

  const [order,   setOrder]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrder(orderId)
      .then(res => setOrder(res.order ?? res))
      .catch(() => toast('Failed to load order', 'error'))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:100 }}>
      <Loader2 size={32} className="animate-spin" style={{ color:'var(--gold)' }} />
    </div>
  )

  if (!order) return (
    <div style={{ textAlign:'center', padding:60, color:'var(--ink-5)' }}>
      Order not found. <Link href="/orders">← Back to List</Link>
    </div>
  )

  const addr = order.shipping_address ?? {}

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: 20, flexWrap:'wrap' }}>
        <Link href="/orders" className="btn btn-sm btn-ghost">← Orders</Link>
        <h2 style={{ fontFamily:'monospace', fontWeight:700, margin:0 }}>{order.order_number}</h2>
        <Badge status={order.status} />
        <Badge status={order.payment_status} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:20, alignItems:'start' }}>
        
        {/* LEFT COLUMN: CUSTOMER & PAYMENT info */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="detail-card">
            <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <User size={16} /> Customer
            </div>
            <div className="detail-row"><span className="detail-lbl">Name</span><span className="detail-val">{order.user?.name ?? 'Guest'}</span></div>
            <div className="detail-row"><span className="detail-lbl">Email</span><span className="detail-val">{order.user?.email ?? '—'}</span></div>
            <div className="detail-row"><span className="detail-lbl">Placed</span><span className="detail-val">{new Date(order.created_at).toLocaleString('en-IN')}</span></div>
            <div className="detail-row"><span className="detail-lbl">Total Paid</span><span className="detail-val" style={{ fontWeight:700, color:'var(--maroon)', fontSize: 16 }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</span></div>
          </div>

          <div className="detail-card">
            <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <MapPin size={16} /> Shipping Address
            </div>
            <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.7, marginTop:8 }}>
              <div style={{ fontWeight:600, color: 'var(--ink-1)' }}>{addr.name}</div>
              <div>{addr.address}</div>
              <div>{addr.city}, {addr.state} – <span style={{ fontWeight:600 }}>{addr.pincode}</span></div>
              <div style={{ marginTop: 4, fontWeight: 500 }}>📞 {addr.phone}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ITEMS & STATUS */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><Package size={16} /> Items ({order.items?.length ?? 0})</div></div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {(order.items ?? []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td><div style={{ fontWeight:600, fontSize:13 }}>{item.name}</div></td>
                      <td><div style={{ fontFamily:'monospace', fontSize:11 }}>{item.product_code}</div></td>
                      <td style={{ textAlign:'center' }}>{item.quantity}</td>
                      <td>₹{Number(item.price).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight:700 }}>₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simplified Read-Only Summary */}
          <div className="detail-card">
            <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><Truck size={16}/> Fulfillment Summary</div>
            <div className="detail-row"><span className="detail-lbl">Current Status</span><Badge status={order.status} /></div>
            <div className="detail-row"><span className="detail-lbl">Tracking ID</span><span style={{ fontFamily:'monospace' }}>{order.awb ?? 'Not yet shipped'}</span></div>
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" className="btn btn-sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
                Track Shipment <ExternalLink size={12} />
              </a>
            )}
            <p style={{ fontSize: 11, color: 'var(--ink-5)', marginTop: 15, fontStyle: 'italic' }}>
              Automation is active. Order updates automatically via Shiprocket.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}