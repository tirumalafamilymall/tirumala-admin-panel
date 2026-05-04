'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getOrder, updateOrderStatus, createShipment, generateAWB, getLabel, cancelShipment } from '@/lib/api'
import { Badge, Confirm, toast } from '@/components/admin/ui'

const MOCK_ORDER = {
  id:'TFM-87291', status:'DELIVERED',
  createdAt:'18 Apr 2026 · 2:34 PM',
  customer:{ name:'Priya Sharma', email:'priya.sharma@gmail.com', phone:'+91 98765 43210' },
  shippingAddress:{ line1:'123 Main Street, Near Bus Stand', city:'Tekkali', state:'Andhra Pradesh', pincode:'532201', phone:'+91 98765 43210' },
  items:[{ name:'Silk Blend Saree', image:'🥻', qty:1, price:1299, total:1299, variant:'Red · Free Size' }],
  amount:1299,
  paymentMethod:'ONLINE',
  paymentStatus:'PAID',
  razorpayOrderId:'ord_Qx7k2mN9pL1',
  razorpayPaymentId:'pay_Qx7k2mR9pL3',
  shiprocketOrderId:'SR-98271',
  awb:'SR123456789IN',
  trackingUrl:'https://shiprocket.in/track/TFM87291',
}

const STEPS = ['Shipment\nCreated','AWB\nGenerated','Label\nPrinted','Out for\nDelivery','Delivered']
const STATUS_STEPS: Record<string,number> = {
  PENDING:0, CONFIRMED:0, SHIPPED:3, DELIVERED:5, CANCELLED:0
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder]           = useState(MOCK_ORDER)
  const [loading, setLoading]       = useState(false)
  const [newStatus, setNewStatus]   = useState(MOCK_ORDER.status)
  const [trackingUrl, setTrackingUrl] = useState(MOCK_ORDER.trackingUrl || '')
  const [saving, setSaving]         = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  // In production: fetch real order
  // useEffect(() => { getOrder(id as string).then(setOrder).catch(() => toast('Could not load order','error')) }, [id])

  const doneSteps = STATUS_STEPS[order.status] || 0

  async function handleStatusSave() {
    setSaving(true)
    try {
      await updateOrderStatus(order.id, { status: newStatus, trackingUrl })
      setOrder(o => ({ ...o, status: newStatus, trackingUrl }))
      toast('Order status updated', 'success')
    } catch (e: any) { toast(e.message, 'error') }
    setSaving(false)
  }

  async function handleCreateShipment() {
    setActionLoading('shipment')
    try { await createShipment({ orderId: order.id }); toast('Shipment created!', 'success') }
    catch (e: any) { toast(e.message, 'error') }
    setActionLoading('')
  }

  async function handleAWB() {
    setActionLoading('awb')
    try { await generateAWB({ shiprocketOrderId: order.shiprocketOrderId }); toast('AWB generated!', 'success') }
    catch (e: any) { toast(e.message, 'error') }
    setActionLoading('')
  }

  async function handleLabel() {
    setActionLoading('label')
    try { await getLabel({ awb: order.awb }); toast('Label downloading…', 'success') }
    catch (e: any) { toast(e.message, 'error') }
    setActionLoading('')
  }

  async function handleCancelShipment() {
    try { await cancelShipment({ awb: order.awb }); toast('Shipment cancelled', 'success') }
    catch (e: any) { toast(e.message, 'error') }
  }

  return (
    <>
      {/* Back bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <Link href="/admin/orders" className="btn btn-sm btn-ghost">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 2L3 6l4 4"/></svg>
          Back to Orders
        </Link>
        <span style={{ color:'var(--border-2)' }}>|</span>
        <span className="ord-id" style={{ fontSize:13 }}>{order.id}</span>
        <Badge status={order.status} />
        <span style={{ fontSize:11.5, color:'var(--ink-5)' }}>Placed {order.createdAt}</span>
      </div>

      <div className="order-detail-cols">
        {/* LEFT */}
        <div className="flex-col">

          {/* Items */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Order Items</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, color:'var(--maroon)' }}>
                ₹{order.amount.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div className="prod-thumb" style={{ background:'var(--maroon-tint)' }}>{item.image}</div>
                          <div>
                            <div style={{ fontWeight:600 }}>{item.name}</div>
                            <div style={{ fontSize:11, color:'var(--ink-5)' }}>{item.variant}</div>
                          </div>
                        </div>
                      </td>
                      <td>{item.qty}</td>
                      <td>₹{item.price.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight:700 }}>₹{item.total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:24 }}>
              <span style={{ fontSize:12, color:'var(--ink-4)' }}>Shipping: <strong style={{ color:'var(--green)' }}>FREE</strong></span>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--maroon)' }}>Total: ₹{order.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Shipping tracker */}
          <div className="card">
            <div className="card-header"><div className="card-title">Shipping & Tracking</div></div>
            <div style={{ padding:'20px 24px' }}>
              {/* Step track */}
              <div className="ship-track">
                {STEPS.map((label, i) => (
                  <div key={i} className={`ship-step ${i < doneSteps ? 'done' : i === doneSteps ? 'active' : ''}`}>
                    <div className="ship-dot">{i < doneSteps ? '✓' : i + 1}</div>
                    <div className="ship-lbl">{label}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                {!order.shiprocketOrderId && (
                  <button className="btn btn-primary" onClick={handleCreateShipment} disabled={actionLoading==='shipment'}>
                    🚚 {actionLoading==='shipment' ? 'Creating…' : 'Create Shipment'}
                  </button>
                )}
                {order.shiprocketOrderId && !order.awb && (
                  <button className="btn btn-gold" onClick={handleAWB} disabled={actionLoading==='awb'}>
                    🏷️ {actionLoading==='awb' ? 'Generating…' : 'Generate AWB'}
                  </button>
                )}
                {order.awb && (
                  <button className="btn btn-green" onClick={handleLabel} disabled={actionLoading==='label'}>
                    📄 {actionLoading==='label' ? 'Downloading…' : 'Download Label'}
                  </button>
                )}
                {order.status === 'SHIPPED' && (
                  <button className="btn btn-danger" onClick={() => setCancelOpen(true)}>
                    ✕ Cancel Shipment
                  </button>
                )}
              </div>

              {order.trackingUrl && (
                <div style={{ background:'var(--cream-2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
                  <span style={{ color:'var(--ink-5)' }}>Tracking URL: </span>
                  <a href={order.trackingUrl} target="_blank" style={{ color:'var(--maroon)', fontWeight:600 }}>{order.trackingUrl}</a>
                  {order.awb && <><span style={{ color:'var(--border-2)', margin:'0 8px' }}>·</span><span style={{ color:'var(--ink-4)' }}>AWB: {order.awb}</span></>}
                </div>
              )}
            </div>
          </div>

          {/* Update status */}
          <div className="card">
            <div className="card-header"><div className="card-title">Update Order Status</div></div>
            <div style={{ padding:'16px 20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div className="fgroup">
                  <label className="flabel">Status</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    {['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="fgroup">
                  <label className="flabel">Tracking URL</label>
                  <input className="finput" type="text" placeholder="Paste tracking link…" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleStatusSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-col">
          {/* Customer */}
          <div className="detail-card">
            <h4>Customer</h4>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--gold))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {order.customer.name[0]}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{order.customer.name}</div>
                <div style={{ fontSize:12, color:'var(--ink-5)' }}>{order.customer.email}</div>
                <div style={{ fontSize:12, color:'var(--ink-5)' }}>{order.customer.phone}</div>
              </div>
            </div>
            <div className="divider" />
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink-5)', marginBottom:8 }}>Shipping Address</div>
              <div style={{ fontSize:12.5, lineHeight:1.8, color:'var(--ink)' }}>
                {order.customer.name}<br />
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}<br />
                <span style={{ color:'var(--ink-5)' }}>Ph: {order.shippingAddress.phone}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="detail-card">
            <h4>Payment</h4>
            <div className="detail-row"><span className="detail-lbl">Method</span><span className="detail-val">{order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Online (Razorpay)'}</span></div>
            <div className="detail-row"><span className="detail-lbl">Status</span><span className="detail-val"><Badge status={order.paymentStatus} /></span></div>
            {order.razorpayOrderId && (
              <div className="detail-row"><span className="detail-lbl">Razorpay Order</span><span className="detail-val" style={{ fontFamily:'monospace', fontSize:11 }}>{order.razorpayOrderId}</span></div>
            )}
            {order.razorpayPaymentId && (
              <div className="detail-row"><span className="detail-lbl">Payment ID</span><span className="detail-val" style={{ fontFamily:'monospace', fontSize:11 }}>{order.razorpayPaymentId}</span></div>
            )}
            <div className="detail-row"><span className="detail-lbl">Total Paid</span><span className="detail-val" style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, color:'var(--maroon)' }}>₹{order.amount.toLocaleString('en-IN')}</span></div>
          </div>

          {/* Timeline */}
          <div className="detail-card">
            <h4>Order Timeline</h4>
            {[
              ['Delivered', '18 Apr · 5:22 PM', 'var(--green)'],
              ['Shipped via Shiprocket', '17 Apr · 10:14 AM', 'var(--purple)'],
              ['Order Confirmed', '16 Apr · 3:00 PM', 'var(--blue)'],
              ['Payment Received', '16 Apr · 2:45 PM', 'var(--green)'],
              ['Order Placed', '16 Apr · 2:34 PM', 'var(--amber)'],
            ].map(([ev, dt, c], i, arr) => (
              <div key={i} style={{ display:'flex', gap:12, paddingBottom: i < arr.length-1 ? 14 : 0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:c, flexShrink:0, marginTop:3 }} />
                  {i < arr.length-1 && <div style={{ flex:1, width:1, background:'var(--border)', margin:'4px 0' }} />}
                </div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:500 }}>{ev}</div>
                  <div style={{ fontSize:11, color:'var(--ink-5)' }}>{dt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Confirm open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancelShipment}
        title="Cancel Shipment" message="This will cancel the Shiprocket shipment. The order status will be updated accordingly. This cannot be undone."
        icon="🚫" confirmLabel="Yes, Cancel Shipment" />
    </>
  )
}
