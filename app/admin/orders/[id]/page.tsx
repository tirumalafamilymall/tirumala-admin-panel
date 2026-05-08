'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getOrder, updateOrderStatus, createShipment, generateAWB, getLabel } from '@/lib/api'
import { Badge, toast } from '@/components/admin/ui'
import { Loader2 } from 'lucide-react'


const STATUS_OPTIONS = ['PENDING','CONFIRMED','SHIPPED','DELIVERED']

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
    setActionLoading('shipment')
    try { 
      await createShipment(orderId)
      const res = await getOrder(orderId)
      setOrder(res.order ?? res)
      toast('Shipment created!', 'success') 
    }
    catch (e: any) { toast(e?.message || 'Error', 'error') }
    setActionLoading('')
  }

  async function handleAWB() {
    setActionLoading('awb')
    try {
      await generateAWB(orderId, order?.shiprocket_shipment_id ?? '')
      const res = await getOrder(orderId)
      setOrder(res.order ?? res)
      toast('AWB generated!', 'success')
    } catch (e: any) { toast(e?.message || 'Error', 'error') }
    setActionLoading('')
  }

  async function handleLabel() {
    setActionLoading('label')
    try {
      const res = await getLabel(order?.shiprocket_shipment_id ?? '')
      if (res.label_url) window.open(res.label_url, '_blank')
      toast('Label ready', 'success')
    } catch (e: any) { toast(e?.message || 'Error', 'error') }
    setActionLoading('')
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <Loader2 size={28} className="animate-spin" style={{ color:'var(--ink-5)' }} />
    </div>
  )

  if (!order) return (
    <div style={{ textAlign:'center', padding:60, color:'var(--ink-5)' }}>
      Order not found. <Link href="/admin/orders">← Back</Link>
    </div>
  )

  const addr = order.shipping_address ?? {}

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <Link href="/admin/orders" className="btn btn-sm btn-ghost">← Back to Orders</Link>
        <span style={{ fontFamily:'monospace', fontWeight:700 }}>{order.order_number}</span>
        <Badge status={order.status} />
        <Badge status={order.payment_status} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:16, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="detail-card">
            <div className="card-title" style={{ marginBottom:12 }}>Customer</div>
            <div className="detail-row"><span className="detail-lbl">Name</span><span className="detail-val">{order.user?.name ?? '—'}</span></div>
            <div className="detail-row"><span className="detail-lbl">Email</span><span className="detail-val">{order.user?.email ?? '—'}</span></div>
            <div className="detail-row"><span className="detail-lbl">Placed</span><span className="detail-val">{new Date(order.created_at).toLocaleString('en-IN')}</span></div>
            <div className="detail-row"><span className="detail-lbl">Total</span><span className="detail-val" style={{ fontWeight:700, color:'var(--maroon)' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</span></div>
          </div>

          <div className="detail-card">
            <div className="card-title" style={{ marginBottom:12 }}>Shipping Address</div>
            <div style={{ fontSize:13, color:'var(--ink-3)', lineHeight:1.7 }}>
              <div style={{ fontWeight:600 }}>{addr.name}</div>
              <div>{addr.address}</div>
              <div>{addr.city}, {addr.state} – {addr.pincode}</div>
              <div>📞 {addr.phone}</div>
            </div>
          </div>

          <div className="detail-card">
            <div className="card-title" style={{ marginBottom:12 }}>Payment</div>
            <div className="detail-row"><span className="detail-lbl">Status</span><Badge status={order.payment_status} /></div>
            {order.razorpay_payment_id && <div className="detail-row"><span className="detail-lbl">Payment ID</span><span className="detail-val" style={{ fontFamily:'monospace', fontSize:11 }}>{order.razorpay_payment_id}</span></div>}
            {order.razorpay_order_id   && <div className="detail-row"><span className="detail-lbl">Razorpay Order</span><span className="detail-val" style={{ fontFamily:'monospace', fontSize:11 }}>{order.razorpay_order_id}</span></div>}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Items ({order.items?.length ?? 0})</div></div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {(order.items ?? []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {item.image
                            ? <img src={item.image} style={{ width:36, height:44, objectFit:'cover', borderRadius:6, background:'var(--cream-2)' }} />
                            : <div style={{ width:36, height:44, borderRadius:6, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👗</div>}
                          <div>
                            <div style={{ fontWeight:600, fontSize:12.5 }}>{item.name}</div>
                            {item.size  && <div style={{ fontSize:11, color:'var(--ink-5)' }}>Size: {item.size}</div>}
                            {item.color && <div style={{ fontSize:11, color:'var(--ink-5)' }}>Color: {item.color}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign:'center' }}>{item.quantity}</td>
                      <td>₹{Number(item.price).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight:700 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="detail-card">
            <div className="card-title" style={{ marginBottom:12 }}>Update Status</div>
            <div className="fgroup" style={{ marginBottom:10 }}>
              <label className="flabel">Order Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="fgroup" style={{ marginBottom:12 }}>
              <label className="flabel">Tracking URL</label>
              <input className="finput" placeholder="https://shiprocket.co/tracking/…" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleStatusSave} disabled={saving} style={{ width:'100%' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          <div className="detail-card">
            <div className="card-title" style={{ marginBottom:12 }}>Shiprocket Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button className="btn btn-primary" onClick={handleCreateShipment} disabled={actionLoading === 'shipment'}>
                {actionLoading === 'shipment' ? 'Creating…' : '🚚 Create Shipment'}
              </button>
              <button className="btn" onClick={handleAWB} disabled={actionLoading === 'awb' || !order.shiprocket_shipment_id}>
                {actionLoading === 'awb' ? 'Generating…' : '🏷️ Generate AWB'}
              </button>
              <button className="btn btn-gold" onClick={handleLabel} disabled={actionLoading === 'label' || !order.shiprocket_shipment_id}>
                {actionLoading === 'label' ? 'Loading…' : '🖨️ Download Label'}
              </button>
            </div>
            {order.awb && <div style={{ marginTop:10, fontSize:11.5, color:'var(--ink-5)' }}>AWB: {order.awb}</div>}
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" style={{ display:'block', marginTop:6, fontSize:12, color:'var(--maroon)' }}>
                Track Shipment →
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}