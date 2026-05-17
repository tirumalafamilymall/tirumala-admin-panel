'use client'

import { useState, useEffect, useCallback } from 'react'
import { getOrders, getLabel, createShipment, generateAWB } from '@/lib/api' 
import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'
import { Truck, FileText, CheckCircle2, Search, Loader2, Download, ExternalLink, CalendarDays, PackageSearch } from 'lucide-react'

export default function ShippingPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('CONFIRMED')

  const PER_PAGE = 20

  const loadShippingQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getOrders({ 
        page, 
        limit: PER_PAGE,
        status: statusFilter || undefined,
        search: search || undefined
      })
      
      const dataItems = res.orders || []
      setOrders(dataItems)
      setTotal(res.total || 0)
    } catch (e: any) {
      toast("Failed to load shipping queue metrics", "error")
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { loadShippingQueue() }, [loadShippingQueue])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadShippingQueue() }, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleCreateManifest = async (orderId: string) => {
    setProcessingId(orderId)
    try {
      const res = await createShipment(orderId)
      if (res.success) {
        toast(`Order linked to Shiprocket! ID: ${res.shiprocket.order_id}`, "success")
        loadShippingQueue()
      }
    } catch (e: any) {
      toast(e.message || "Fulfillment initialization failed", "error")
    } finally {
      setProcessingId(null)
    }
  }

  const handleAllocateCourier = async (orderId: string, shiprocketOrderId: string) => {
    setProcessingId(orderId)
    try {
      const res = await generateAWB(orderId, shiprocketOrderId)
      if (res.success) {
        toast("AWB tracking number linked & pickup request dispatched!", "success")
        loadShippingQueue()
      }
    } catch (e: any) {
      toast(e.message || "Fleet route allocation error", "error")
    } finally {
      setProcessingId(null)
    }
  }

  const handleDownloadLabel = async (shiprocketOrderId: string) => {
    try {
      toast("Downloading print documentation context...", "info")
      const res = await getLabel(shiprocketOrderId)
      
      if (res.label?.label_url) {
        window.open(res.label.label_url, '_blank')
      }
      if (res.manifest?.manifest_url) {
        window.open(res.manifest.manifest_url, '_blank')
      }
    } catch (e) {
      toast("Failed to download print metrics", "error")
    }
  }

  return (
    <div className="space-y-8 max-w-350 mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* ── PREMIUM HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <PackageSearch className="text-amber-600" size={28} />
            Logistics Command
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            Manage your fleet routing, courier allocation, and dispatch documentation.
          </p>
        </div>
      </div>

      {/* ── METRIC FILTERS SUMMARY HEADER ── */}
      <div className="filter-bar flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200/60 shadow-sm">
        <div className="filter-search relative flex-1 min-w-70">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all shadow-inner"
            placeholder="Search by Order reference, AWB, or Customer..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none cursor-pointer hover:bg-gray-50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="CONFIRMED">Ready to Manifest (Paid)</option>
            <option value="SHIPPED">Dispatched & In Transit</option>
            <option value="DELIVERED">Delivered Parcels</option>
            <option value="">Full Operational Queue</option>
          </select>

          <div className="bg-gray-900 border border-gray-800 px-5 py-2.5 rounded-xl text-xs font-bold text-white tracking-wider uppercase shadow-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            {total} Shipments
          </div>
        </div>
      </div>

      {/* ── LOGISTICS AUTOMATION LEDGER ── */}
      <div className="bg-white rounded-3xl border border-gray-200/60 shadow-xl shadow-gray-200/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="p-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Order Reference</th>
                <th className="p-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Logistics Routing Nodes</th>
                <th className="p-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fulfillment Status</th>
                <th className="p-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Consignee & Destination</th>
                <th className="p-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Automation Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <SkeletonRows cols={5} rows={6} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-24">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <PackageSearch size={48} className="mb-4 text-gray-300" strokeWidth={1.5} />
                      <p className="text-sm font-medium tracking-wide">No active shipments in this queue.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isProcessing = processingId === o.id
                  
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/60 transition-colors duration-200 group">
                      
                      {/* Order Reference Number */}
                      <td className="p-5 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-lg w-fit shadow-sm">
                            {o.order_number}
                          </span>
                          <span className="text-[11px] font-medium text-gray-400 pl-1">
                            {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      
                      {/* Shiprocket Internal Order Mappings */}
                      <td className="p-5 align-top">
                        {o.shiprocket_order_id ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold text-gray-700 font-mono flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              SR: {o.shiprocket_order_id}
                            </span>
                            {o.tracking_url && (
                              <a 
                                href={o.tracking_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 w-fit transition-colors"
                              >
                                <ExternalLink size={12} /> Live Tracking
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs italic text-gray-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            Unmanifested
                          </span>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="p-5 align-top">
                        <div className="pt-1">
                           <Badge status={o.status} />
                        </div>
                      </td>

                      {/* Customer Address Node Summary */}
                      <td className="p-5 align-top">
                        <div className="text-sm max-w-[220px]">
                          <p className="font-bold text-gray-900 truncate">{(o.shipping_address as any)?.name}</p>
                          <p className="text-gray-500 font-medium text-xs leading-relaxed mt-1">
                            {(o.shipping_address as any)?.city}, {(o.shipping_address as any)?.state} <br/> 
                            PIN: <span className="text-gray-700 font-semibold">{(o.shipping_address as any)?.pincode}</span>
                          </p>
                        </div>
                      </td>

                      {/* Automation Dispatch Controls */}
                      <td className="p-5 align-top text-right">
                        <div className="flex items-center justify-end gap-2 pt-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          
                          {/* CASE 1: Need to Link Shiprocket */}
                          {!o.shiprocket_order_id && (
                            <button
                              onClick={() => handleCreateManifest(o.id)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                            >
                              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                              Link Shiprocket
                            </button>
                          )}

                          {/* CASE 2: Book Fleet */}
                          {o.shiprocket_order_id && o.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleAllocateCourier(o.id, o.shiprocket_order_id)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 disabled:from-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:shadow-amber-500/20 active:scale-95"
                            >
                              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
                              Book Fleet Courier
                            </button>
                          )}

                          {/* CASE 3: Downloads */}
                          {o.shiprocket_order_id && (
                            <button
                              onClick={() => handleDownloadLabel(o.shiprocket_order_id)}
                              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center active:scale-95"
                              title="Download Shipping Slips & Manifests"
                            >
                              <Download size={15} />
                            </button>
                          )}

                          {/* Completed State */}
                          {o.status === 'DELIVERED' && (
                            <div className="w-9 h-9 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600 shadow-sm" title="Delivered Safely">
                              <CheckCircle2 size={18} strokeWidth={2.5} />
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
        
        {/* Pagination Controls */}
        <div className="border-t border-gray-100 p-5 bg-gray-50/30">
          <Pagination page={page} total={Math.ceil(total / PER_PAGE)} perPage={PER_PAGE} totalItems={total} onChange={setPage} />
        </div>
      </div>

    </div>
  )
}