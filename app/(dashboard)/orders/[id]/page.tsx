'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Badge, toast } from '@/components/admin/ui'
// 🔥 1. Added Printer to the imports
import { Loader2, ExternalLink, Package, User, CreditCard, MapPin, Truck, Printer } from 'lucide-react' 
import { getOrder, createShipment, generateAWB, getLabel, schedulePickup } from '@/lib/api'

export default function OrderDetailPage() {
  const params  = useParams()
  const orderId = params.id as string

  const [order,   setOrder]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // 🔥 2. Added a loading state specifically for the buttons
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getOrder(orderId)
      .then(res => setOrder(res.order ?? res))
      .catch(() => toast('Failed to load order', 'error'))
      .finally(() => setLoading(false))
  }, [orderId])

async function handleAssignShipping() {
    setActionLoading(true)
    try {
      // Step 1: Sync order to Shiprocket if it doesn't have an ID
      let shipmentId = order.shiprocket_order_id;
      if (!shipmentId) {
        toast('Syncing with Shiprocket...', 'info')
        const res = await createShipment(order.id)
        shipmentId = res.shiprocket?.shipment_id || res.shiprocket?.order_id
      }

      // Step 2: Assign courier and schedule pickup
      toast('Allocating Courier...', 'info')
      await generateAWB(order.id, shipmentId)
      await schedulePickup(order.id, shipmentId)
      
      // Refresh order data
      const updatedOrder = await getOrder(orderId)
      setOrder(updatedOrder.order ?? updatedOrder)
      toast('AWB allocated and pickup scheduled!', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

async function handlePrintLabel() {
    setActionLoading(true)
    try {
      const res = await getLabel(order.shiprocket_order_id)
      if (res.label?.label_url) window.open(res.label.label_url, '_blank')
      if (res.manifest?.manifest_url) window.open(res.manifest.manifest_url, '_blank')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

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
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 44, height: 44, background: 'var(--cream-2)', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--ink-4)', textAlign: 'center' }}>No Img</div>
                          )}
                          
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, lineHeight: 1.2 }}>{item.name}</div>
                            
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              {item.size && (
                                <span style={{ fontSize: 10, background: 'var(--cream-1)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 700, color: '#BE185D' }}>
                                  Size: {item.size}
                                </span>
                              )}
                              {item.color && (
                                <span style={{ fontSize: 10, background: 'var(--cream-1)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 700, color: '#0369A1' }}>
                                  Color: {item.color}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><div style={{ fontFamily:'monospace', fontSize:11, color: 'var(--ink-3)' }}>{item.product_code}</div></td>
                      <td style={{ textAlign:'center', fontWeight: 700, fontSize: 14 }}>{item.quantity}</td>
                      <td>₹{Number(item.price).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight:700 }}>₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🔥 5. Replaced the Read-Only Summary with the Interactive Logistics Console */}
          <div className="detail-card">
            <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 16 }}>
              <Truck size={16}/> Fulfillment & Shipping
            </div>
            
            {order.status !== 'SHIPPED' && order.status !== 'DELIVERED' ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>
                  Ready to pack items. Click below to generate the barcode details for the Shiprocket pick-up driver.
                </p>
                <button 
                  className="btn" 
                  style={{ width: '100%', justifyContent: 'center' }} 
                  onClick={handleAssignShipping} 
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                  {actionLoading ? ' Processing...' : ' Assign Courier & Schedule Pickup'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: 'var(--cream-2)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>AWB / Tracking Code</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 16, color: 'var(--ink-1)' }}>
                    {order.awb_code || 'Allocated'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                  <button 
                    className="btn" 
                    style={{ width: '100%', justifyContent: 'center', background: '#1a1a1a', color: '#ffffff' }}
                    onClick={handlePrintLabel} 
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                    {actionLoading ? ' Fetching Label...' : ' Print Shipping Label'}
                  </button>

                  {order.tracking_url && (
                    <a href={order.tracking_url} target="_blank" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                      Track Shipment <ExternalLink size={12} style={{ marginLeft: 6 }} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </>
  )
}