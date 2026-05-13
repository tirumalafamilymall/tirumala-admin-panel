'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getOrder, updateOrderStatus, createShipment, generateAWB, getLabel, schedulePickup } from '@/lib/api'
import { Badge, toast } from '@/components/admin/ui'
import { Loader2, ExternalLink, Package, User, CreditCard, MapPin } from 'lucide-react'

const STATUS_OPTIONS = ['PENDING','CONFIRMED','SHIPPED','DELIVERED', 'CANCELLED']

export default function OrderDetailPage() {
  const params  = useParams()
  const orderId = params.id as string

  const [order,         setOrder]         = useState<any>(null)
  const [loading,       setLoading]       = useState(true)
  const [newStatus,     setNewStatus]     = useState('')
  const [trackingUrl,   setTrackingUrl]   = useState('')
  const [saving,        setSaving]        = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    getOrder(orderId)
      .then(res => {
        const o = res.order ?? res
        setOrder(o)
        setNewStatus(o.status)
        setTrackingUrl(o.tracking_url ?? '')
      })
      .catch(() => toast('Failed to load order', 'error'))
      .finally(() => setLoading(false))
  }, [orderId])

  async function handleStatusSave() {
    setSaving(true)
    try {
      await updateOrderStatus(orderId, { status: newStatus, tracking_url: trackingUrl || undefined })
      setOrder((o: any) => ({ ...o, status: newStatus, tracking_url: trackingUrl }))
      toast('Order updated', 'success')
    } catch (e: any) { toast(e?.message || 'Failed', 'error') }
    setSaving(false)
  }

  async function handleCreateShipment() {
    setActionLoading('shipment');
    try { 
      await createShipment(orderId);
      const res = await getOrder(orderId);
      setOrder(res.order ?? res);
      toast('Shipment created in Shiprocket!', 'success'); 
    }
    catch (e: any) { toast(e?.message || 'Shiprocket Error', 'error') }
    setActionLoading('');
  }

  async function handleAWB() {
    setActionLoading('awb');
    try {
      await generateAWB(orderId, order?.shiprocket_shipment_id ?? '');
      const res = await getOrder(orderId);
      setOrder(res.order ?? res);
      toast('AWB/Tracking Assigned!', 'success');
    } catch (e: any) { toast(e?.message || 'AWB Error', 'error') }
    setActionLoading('');
  }

  async function handleLabel() {
    setActionLoading('label')
    try {
      const res = await getLabel(order?.shiprocket_shipment_id ?? '')
      if (res.label_url) window.open(res.label_url, '_blank')
      toast('Shipping Label opened', 'success')
    } catch (e: any) { toast(e?.message || 'Label Error', 'error') }
    setActionLoading('')
  }

  async function handlePickup() {
    setActionLoading('pickup')
    try {
      await schedulePickup(orderId, order?.shiprocket_shipment_id ?? '')
      const res = await getOrder(orderId)
      setOrder(res.order ?? res)
      toast('Pickup Scheduled! Courier is notified.', 'success')
    } catch (e: any) { toast(e?.message || 'Pickup Failed', 'error') }
    setActionLoading('')
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

          <div className="detail-card">
            <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <CreditCard size={16} /> Payment Details
            </div>
            <div className="detail-row"><span className="detail-lbl">Status</span><Badge status={order.payment_status} /></div>
            {order.payment_id && <div className="detail-row"><span className="detail-lbl">Payment ID</span><span className="detail-val" style={{ fontFamily:'monospace', fontSize:11 }}>{order.payment_id}</span></div>}
            {order.razorpay_order_id && <div className="detail-row"><span className="detail-lbl">Razorpay ID</span><span className="detail-val" style={{ fontFamily:'monospace', fontSize:11 }}>{order.razorpay_order_id}</span></div>}
          </div>
        </div>

        {/* RIGHT COLUMN: ITEMS & SHIPROCKET */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><Package size={16} /> Items ({order.items?.length ?? 0})</div></div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU / Variant</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          {item.image
                            ? <img src={item.image} style={{ width:40, height:50, objectFit:'cover', borderRadius:4, border:'1px solid var(--border)' }} />
                            : <div style={{ width:40, height:50, borderRadius:4, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👗</div>}
                          <div style={{ fontWeight:600, fontSize:13 }}>{item.name}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily:'monospace', fontSize:11, color:'var(--ink-3)', marginBottom: 2 }}>{item.product_code}</div>
                        <div style={{ display:'flex', gap:4 }}>
                          {item.size && <span style={{ fontSize:10, background:'var(--cream-2)', padding:'1px 5px', borderRadius:3, border:'1px solid var(--border)' }}>Size: {item.size}</span>}
                          {item.color && <span style={{ fontSize:10, background:'var(--cream-2)', padding:'1px 5px', borderRadius:3, border:'1px solid var(--border)' }}>Color: {item.color}</span>}
                        </div>
                      </td>
                      <td style={{ textAlign:'center', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ fontSize: 12 }}>₹{Number(item.price).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight:700 }}>₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="detail-card">
              <div className="card-title">Order Status</div>
              <div className="fgroup" style={{ margin:'10px 0' }}>
                <select className="finput" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="fgroup" style={{ marginBottom:12 }}>
                <label className="flabel">Tracking URL</label>
                <input className="finput" placeholder="https://shiprocket.co/…" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleStatusSave} disabled={saving} style={{ width:'100%' }}>
                {saving ? 'Updating...' : 'Update Status'}
              </button>
            </div>

            <div className="detail-card">
              <div className="card-title">Shiprocket Actions</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop: 10 }}>
                {!order.shiprocket_order_id ? (
                  <button className="btn btn-primary" onClick={handleCreateShipment} disabled={actionLoading === 'shipment'}>
                    {actionLoading === 'shipment' ? <Loader2 size={14} className="animate-spin" /> : '🚚 Create Shipment'}
                  </button>
                ) : (
                   <>
                    <button className="btn" onClick={handleAWB} disabled={actionLoading === 'awb' || order.awb}>
                      {actionLoading === 'awb' ? <Loader2 size={14} className="animate-spin" /> : order.awb ? '✓ AWB Generated' : '🏷️ Generate AWB'}
                    </button>
                    <button className="btn btn-gold" onClick={handleLabel} disabled={actionLoading === 'label'}>
                      {actionLoading === 'label' ? <Loader2 size={14} className="animate-spin" /> : '🖨️ Download Label'}
                    </button>
                    <button 
                      className="btn" 
                      style={{ backgroundColor: '#10b981', color: 'white', border: 'none' }}
                      onClick={handlePickup} 
                      disabled={actionLoading === 'pickup' || !order.awb}
                    >
                      {actionLoading === 'pickup' ? <Loader2 size={14} className="animate-spin" /> : '🚛 Schedule Pickup'}
                    </button>
                   </>
                )}
              </div>
              {order.awb && <div style={{ marginTop:12, fontSize:11, padding:8, background:'var(--cream-1)', borderRadius:6, border:'1px dashed var(--border)' }}>
                <strong>Tracking ID:</strong> {order.awb}
                {order.tracking_url && <a href={order.tracking_url} target="_blank" className="flex items-center gap-1" style={{ color:'var(--maroon)', marginTop:4 }}>Track on Shiprocket <ExternalLink size={10}/></a>}
              </div>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}