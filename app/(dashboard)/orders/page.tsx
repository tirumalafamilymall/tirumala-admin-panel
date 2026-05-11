'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getOrders } from '@/lib/api'
import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'

export default function OrdersPage() {
  const [orders,          setOrders]          = useState<any[]>([])
  const [total,           setTotal]           = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [statusFilter,    setStatusFilter]    = useState('')
  const [payFilter,       setPayFilter]       = useState('')
  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [perPage,         setPerPage]         = useState(20)

  // Debounce the search input so it doesn't spam the API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on new search
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders({ 
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
        <select className="flt-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {['PENDING','CONFIRMED','SHIPPED','DELIVERED'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="flt-select" value={payFilter} onChange={e => { setPayFilter(e.target.value); setPage(1) }}>
          <option value="">All Payment</option>
          <option value="PAID">PAID</option>
          <option value="UNPAID">UNPAID</option>
        </select>
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search by order number or customer…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="flt-select ms-auto" value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1) }}>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Order #</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading
                ? <SkeletonRows cols={8} /> 
                : orders.length === 0
                ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--ink-5)' }}>No orders found</td></tr>
                : orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="ord-id">{o.order_number}</span></td>
                    <td style={{ fontWeight:500 }}>{o.user?.name ?? '—'}</td>
                    <td style={{ color:'var(--ink-4)' }}>{o.items?.length ?? 0} item{o.items?.length !== 1 ? 's' : ''}</td>
                    <td style={{ fontWeight:700 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                    <td><Badge status={o.payment_status} /></td>
                    <td><Badge status={o.status} /></td>
                    <td style={{ fontSize:11.5, color:'var(--ink-5)', whiteSpace:'nowrap' }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    <td>
                      <Link href={`/orders/${o.id}`} className="btn btn-sm">View →</Link>
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