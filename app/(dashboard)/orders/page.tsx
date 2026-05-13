'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { adminGetOrders } from '@/lib/api' // Use the correct wrapper name
import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'
import { Search, Filter, Calendar } from 'lucide-react'

export default function OrdersPage() {
  const [orders,           setOrders]          = useState<any[]>([])
  const [total,            setTotal]           = useState(0)
  const [loading,          setLoading]         = useState(true)
  const [statusFilter,     setStatusFilter]    = useState('')
  const [payFilter,        setPayFilter]       = useState('')
  const [search,           setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,             setPage]            = useState(1)
  const [perPage,          setPerPage]         = useState(20)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminGetOrders({ 
        page, 
        limit: perPage, 
        status: statusFilter || undefined,
        payment_status: payFilter || undefined,
        search: debouncedSearch || undefined
      })
      setOrders(res.orders ?? [])
      setTotal(res.total ?? 0)
    } catch (e: any) {
      toast(e.message || 'Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, statusFilter, payFilter, debouncedSearch])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="filter-bar">
        <div style={{ display:'flex', gap:8 }}>
          <select className="flt-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">Fulfillment: All</option>
            {['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="flt-select" value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(1) }}>
            <option value="">Payment: All</option>
            <option value="PAID">PAID</option>
            <option value="UNPAID">UNPAID</option>
          </select>
        </div>

        <div className="filter-search" style={{ flex: 1, maxWidth: 400 }}>
          <Search size={14} style={{ color: 'var(--ink-5)' }} />
          <input type="text" placeholder="Order #, Name, or Email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="flt-select ms-auto" value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1) }}>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <SkeletonRows cols={8} /> 
                : orders.length === 0
                ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--ink-5)' }}>No orders found matching filters</td></tr>
                : orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="ord-id" style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{o.order_number}</span></td>
                    <td>
                      <div style={{ fontWeight:600 }}>{o.user?.name ?? 'Guest'}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{o.user?.email}</div>
                    </td>
                    <td><span style={{ fontSize: 12 }}>{o.items?.length ?? 0} items</span></td>
                    <td style={{ fontWeight:700 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                    <td><Badge status={o.payment_status} /></td>
                    <td><Badge status={o.status} /></td>
                    <td style={{ fontSize:11.5, color:'var(--ink-4)' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {new Date(o.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                       </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/orders/${o.id}`} className="btn btn-sm" style={{ padding: '6px 12px' }}>View Details</Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={Math.ceil(total / perPage)} perPage={perPage} totalItems={total} onChange={setPage} />
      </div>
    </>
  )
}