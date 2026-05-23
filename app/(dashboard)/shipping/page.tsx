'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getOrders, getLabel, createShipment, generateAWB } from '@/lib/api'
import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'
import { Loader2, Truck, Download, ExternalLink, Check } from 'lucide-react'

export default function ShippingPage() {
  const [orders,           setOrders]       = useState<any[]>([])
  const [total,            setTotal]        = useState(0)
  const [loading,          setLoading]      = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [page,             setPage]         = useState(1)
  const [search,           setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('CONFIRMED')

  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders({
        page,
        limit:  PER_PAGE,
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

  async function handleLinkShiprocket(orderId: string) {
    setProcessingId(orderId)
    try {
      const res = await createShipment(orderId)
      if (res.success) {
        toast('Linked to Shiprocket successfully', 'success')
        load()
      }
    } catch (e: any) {
      toast(e.message || 'Failed to link Shiprocket', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleBookCourier(orderId: string, shiprocketOrderId: string) {
    setProcessingId(orderId)
    try {
      const res = await generateAWB(orderId, shiprocketOrderId)
      if (res.success) {
        toast('Courier booked and pickup scheduled', 'success')
        load()
      }
    } catch (e: any) {
      toast(e.message || 'Failed to book courier', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDownloadLabel(shiprocketOrderId: string) {
    try {
      const res = await getLabel(shiprocketOrderId)
      if (res.label?.label_url)    window.open(res.label.label_url, '_blank')
      if (res.manifest?.manifest_url) window.open(res.manifest.manifest_url, '_blank')
    } catch (e: any) {
      toast(e.message || 'Failed to download label', 'error')
    }
  }

  const statusPill = (status: string) => {
    const map: Record<string, string> = {
      CONFIRMED: 'badge badge-CONFIRMED',
      SHIPPED:   'badge badge-SHIPPED',
      DELIVERED: 'badge badge-DELIVERED',
      PENDING:   'badge badge-PENDING',
      CANCELLED: 'badge badge-CANCELLED',
    }
    return map[status] ?? 'badge'
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-1)' }}>Shipping</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-5)', marginTop: 4 }}>
          Manage courier assignments and dispatch
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/>
          </svg>
          <input
            type="text"
            placeholder="Search by order number or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="flt-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="CONFIRMED">Ready to ship</option>
          <option value="SHIPPED">Dispatched</option>
          <option value="DELIVERED">Delivered</option>
          <option value="">All orders</option>
        </select>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 500, padding: '4px 12px',
          borderRadius: 8, background: 'var(--cream-2)',
          border: '1px solid var(--border)', color: 'var(--ink-4)',
          marginLeft: 'auto'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {total} shipments
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Shiprocket</th>
                <th>Status</th>
                <th>Deliver to</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={5} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--ink-5)' }}>
                    <div style={{ fontSize: 13 }}>No shipments found</div>
                  </td>
                </tr>
              ) : (
                orders.map(o => {
                  const isProcessing = processingId === o.id
                  const addr = o.shipping_address ?? {}

                  return (
                    <tr key={o.id}>

                      {/* Order */}
                      <td>
                        <Link href={`/admin/orders/${o.id}`}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                            padding: '2px 8px', background: 'var(--cream-2)',
                            borderRadius: 4, color: 'var(--ink-2)',
                            display: 'inline-block', cursor: 'pointer'
                          }}>
                            {o.order_number}
                          </span>
                        </Link>
                        <div style={{ fontSize: 11, color: 'var(--ink-5)', marginTop: 4 }}>
                          {new Date(o.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </td>

                      {/* Shiprocket */}
                      <td>
                        {o.shiprocket_order_id ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-3)' }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
                              {o.shiprocket_order_id}
                            </div>
                            {o.tracking_url && (
                              <a
                                href={o.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: 11, color: 'var(--maroon)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3 }}
                              >
                                <ExternalLink size={10} /> Live tracking
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ink-5)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border)', display: 'inline-block' }} />
                            Not linked
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <Badge status={o.status} />
                      </td>

                      {/* Deliver to */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-1)' }}>{addr.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-5)', marginTop: 2, lineHeight: 1.5 }}>
                          {addr.city}, {addr.state}<br />
                          PIN: {addr.pincode}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>

                          {!o.shiprocket_order_id && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleLinkShiprocket(o.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Truck size={12} />}
                              {isProcessing ? 'Linking…' : 'Link Shiprocket'}
                            </button>
                          )}

                          {o.shiprocket_order_id && o.status === 'CONFIRMED' && (
                            <button
                              className="btn btn-sm btn-gold"
                              onClick={() => handleBookCourier(o.id, o.shiprocket_order_id)}
                              disabled={isProcessing}
                            >
                              {isProcessing && <Loader2 size={12} className="animate-spin" />}
                              {isProcessing ? 'Booking…' : 'Book courier'}
                            </button>
                          )}

                          {o.shiprocket_order_id && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleDownloadLabel(o.shiprocket_order_id)}
                              title="Download label"
                              style={{ padding: '4px 8px' }}
                            >
                              <Download size={12} />
                            </button>
                          )}

                          {o.status === 'DELIVERED' && (
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: '#dcfce7',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              color: '#16a34a'
                            }}>
                              <Check size={14} />
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
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