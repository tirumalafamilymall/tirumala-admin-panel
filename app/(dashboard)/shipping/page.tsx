'use client'

import { useState, useEffect, useCallback } from 'react'
import { getOrders, getLabel, createShipment, generateAWB } from '@/lib/api' 
import { Badge, SkeletonRows, Pagination, toast } from '@/components/admin/ui'
import { Truck, FileText, CheckCircle2, Search, Loader2, Download, ExternalLink, CalendarDays } from 'lucide-react'

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
      // Pulling active orders from backend pipeline
      const res = await getOrders({ 
        page, 
        limit: PER_PAGE,
        status: statusFilter || undefined,
        search: search || undefined
      })
      
      // Filter cleanly for products running within the logistics funnel
      // Handles unmanifested paid items (CONFIRMED) as well as packages actively moving (SHIPPED)
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

  // STEP 1: Push Paid Order payload into Shiprocket Node
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

  // STEP 2: Lock Courier AWB Number and Allocate Fleet Pickup Slots Simultaneously
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

  // STEP 3: Print Pack Documentation (Slip Labels + Warehouse manifest list)
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
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      
      {/* ── METRIC FILTERS SUMMARY HEADER ── */}
      <div className="filter-bar flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="filter-search relative flex-1 min-w-[280px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-red-600 focus:bg-white transition"
            placeholder="Search by Order number, AWB tracking, or Customer name..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="flt-select px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer focus:border-red-600 transition"
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="CONFIRMED">Ready to Manifest (Paid)</option>
            <option value="SHIPPED">Dispatched & In Transit</option>
            <option value="DELIVERED">Delivered Parcels</option>
            <option value="">Full Operational Queue</option>
          </select>

          <div className="bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 tracking-wider uppercase">
            {total} Shipments Tracked
          </div>
        </div>
      </div>

      {/* ── LOGISTICS AUTOMATION LEDGER ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="p-4 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Order Reference</th>
                <th className="p-4 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Logistics Routing Nodes</th>
                <th className="p-4 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Fulfillment Status</th>
                <th className="p-4 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Consignee & Destination</th>
                <th className="p-4 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-right">Automation Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <SkeletonRows cols={5} rows={6} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-xs font-medium text-gray-400 uppercase tracking-widest">
                    No active shipments captured inside this sector layout module.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isProcessing = processingId === o.id
                  
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/40 transition duration-150">
                      
                      {/* Order Reference Number */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 border border-gray-200 px-2 py-1 rounded-md w-fit">
                            {o.order_number}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400 pl-1">
                            {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </td>
                      
                      {/* Shiprocket Internal Order Mappings */}
                      <td className="p-4">
                        {o.shiprocket_order_id ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-700 font-mono">
                              SR: {o.shiprocket_order_id}
                            </span>
                            {o.tracking_url && (
                              <a 
                                href={o.tracking_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 w-fit hover:underline"
                              >
                                <ExternalLink size={10} /> Live Courier Tracker
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-400 font-medium">Unmanifested Package</span>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="p-4">
                        <Badge status={o.status} />
                      </td>

                      {/* Customer Address Node Summary */}
                      <td className="p-4">
                        <div className="text-xs max-w-xs">
                          <p className="font-bold text-gray-900">{(o.shipping_address as any)?.name}</p>
                          <p className="text-gray-500 font-medium truncate mt-0.5">
                            {(o.shipping_address as any)?.city}, {(o.shipping_address as any)?.state} · {(o.shipping_address as any)?.pincode}
                          </p>
                        </div>
                      </td>

                      {/* Automation Dispatch Controls */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* CASE 1: Order Paid but not yet manifested into Shiprocket network portal */}
                          {!o.shiprocket_order_id && (
                            <button
                              onClick={() => handleCreateManifest(o.id)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-gray-900 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
                            >
                              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
                              Link Shiprocket
                            </button>
                          )}

                          {/* CASE 2: Order is inside Shiprocket engine database cells, but needs AWB router locking codes */}
                          {o.shiprocket_order_id && o.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleAllocateCourier(o.id, o.shiprocket_order_id)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 disabled:from-gray-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
                            >
                              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CalendarDays size={12} />}
                              Book Fleet Courier
                            </button>
                          )}

                          {/* CASE 3: Active dispatch packages can instantly pull documentation elements out */}
                          {o.shiprocket_order_id && (
                            <button
                              onClick={() => handleDownloadLabel(o.shiprocket_order_id)}
                              className="p-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl transition flex items-center justify-center"
                              title="Download Shipping Slips & Manifest Package Invoices"
                            >
                              <Download size={14} />
                            </button>
                          )}

                          {/* Completed Safe State Indicator */}
                          {o.status === 'DELIVERED' && (
                            <div className="w-8 h-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600" title="Delivered Safe">
                              <CheckCircle2 size={15} />
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
        <div className="border-t border-gray-50 p-4">
          <Pagination page={page} total={Math.ceil(total / PER_PAGE)} perPage={PER_PAGE} totalItems={total} onChange={setPage} />
        </div>
      </div>

    </div>
  )
}