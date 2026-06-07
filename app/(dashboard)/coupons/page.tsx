'use client'

import { useEffect, useState, useCallback } from 'react'
import { API_BASE } from '@/lib/api'
import { getAdminToken } from '@/lib/auth'
import { Modal, Confirm, Toggle, SkeletonRows, toast } from '@/components/admin/ui'
import { Tag, Calendar, Trash2 } from 'lucide-react'

type Coupon = {
  id: string
  name: string
  code: string
  description?: string
  discount_percent: number | string
  min_order_value: number | string
  expires_at: string
  is_active: boolean
  created_at: string
}

const emptyForm = {
  name: '',
  code: '',
  description: '',
  discount_percent: '',
  min_order_value: '',
  expires_at: ''
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Coupon | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/coupons`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success) setCoupons(data.coupons)
    } catch (e: any) {
      toast('Failed to load coupons', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCoupons() }, [loadCoupons])

  function fset(k: keyof typeof form, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name || !form.code || !form.discount_percent || !form.min_order_value || !form.expires_at) {
      toast('Please fill all required fields', 'error')
      return
    }

    setSaving(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Save failed')
      
      toast('Coupon created successfully', 'success')
      setAddOpen(false)
      setForm(emptyForm)
      loadCoupons()
    } catch (e: any) {
      toast(e.message, 'error')
    }
    setSaving(false)
  }

  async function toggleActive(p: Coupon) {
    if (togglingId === p.id) return
    setTogglingId(p.id)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/coupons/${p.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_active: !p.is_active })
      })
      if (!res.ok) throw new Error('Update failed')
      
      setCoupons(cs => cs.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
      toast(p.is_active ? 'Coupon paused' : 'Coupon activated', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteItem) return
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/coupons/${deleteItem.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error('Delete failed')
      
      toast('Coupon deleted', 'success')
      setDeleteItem(null)
      loadCoupons()
    } catch (e: any) {
      toast(e.message, 'error')
    }
  }

  return (
    <>
      <div className="filter-bar">
        <div className="filter-search" style={{ visibility: 'hidden' }}>
          {/* Spacer to keep layout intact */}
        </div>
        
        <div className="ms-auto">
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setAddOpen(true) }}>
            <Tag size={14} className="mr-2" /> Create Coupon
          </button>
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Campaign Name</th>
                <th>Discount</th>
                <th>Min. Purchase</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} />
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-5)' }}>
                    No active discount campaigns.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const isExpired = new Date() > new Date(c.expires_at)
                  return (
                    <tr key={c.id} style={{ opacity: isExpired ? 0.6 : 1 }}>
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#9B1C1C', background: '#FEF2F2', padding: '4px 8px', border: '1px solid #FECACA', borderRadius: 6, fontWeight: 700, letterSpacing: '0.05em' }}>
                          {c.code}
                        </span>
                      </td>
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink-1)', fontSize: 13 }}>{c.name}</div>
                        {c.description && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{c.description}</div>}
                      </td>
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle', fontWeight: 700, color: '#047857' }}>
                        {Number(c.discount_percent)}% OFF
                      </td>
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle', fontSize: 13 }}>
                        ₹{Number(c.min_order_value).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isExpired ? '#DC2626' : 'var(--ink-3)' }}>
                          <Calendar size={13} />
                          {new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {isExpired && <span style={{ fontSize: 9, background: '#FEE2E2', color: '#991B1B', padding: '2px 4px', borderRadius: 4, fontWeight: 700 }}>EXPIRED</span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle' }}>
                        <Toggle checked={c.is_active && !isExpired} onChange={() => toggleActive(c)} disabled={togglingId === c.id || isExpired} />
                      </td>
                      <td style={{ padding: '16px 14px', verticalAlign: 'middle' }}>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteItem(c)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Create Discount Coupon"
        footer={<>
          <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Generating...' : 'Launch Campaign'}</button>
        </>}>
        
        <div className="form-grid">
          <div className="fgroup">
            <label className="flabel">Campaign Name *</label>
            <input className="finput" placeholder="e.g. Diwali Mega Sale" value={form.name} onChange={e => fset('name', e.target.value)} />
          </div>
          
          <div className="fgroup">
            <label className="flabel">Coupon Code *</label>
            <input className="finput" style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600, color: '#9B1C1C' }} placeholder="e.g. DIWALI20" value={form.code} onChange={e => fset('code', e.target.value.replace(/\s+/g, '').toUpperCase())} />
          </div>

          <div className="fgroup full">
            <label className="flabel">Internal Description (Optional)</label>
            <input className="finput" placeholder="Notes for your team..." value={form.description} onChange={e => fset('description', e.target.value)} />
          </div>

          <div className="fgroup">
            <label className="flabel">Discount Percentage (%) *</label>
            <input className="finput" type="number" placeholder="e.g. 10" value={form.discount_percent} onChange={e => fset('discount_percent', e.target.value)} />
          </div>

          <div className="fgroup">
            <label className="flabel">Min. Order Value (₹) *</label>
            <input className="finput" type="number" placeholder="e.g. 1500" value={form.min_order_value} onChange={e => fset('min_order_value', e.target.value)} />
          </div>

          <div className="fgroup full">
            <label className="flabel">Expiry Date & Time *</label>
            <input className="finput" type="datetime-local" value={form.expires_at} onChange={e => fset('expires_at', e.target.value)} />
          </div>
        </div>
      </Modal>

      <Confirm 
        open={!!deleteItem} 
        onClose={() => setDeleteItem(null)} 
        onConfirm={handleDelete}
        title="Delete Coupon" 
        message={`Are you sure you want to permanently delete the code <b>${deleteItem?.code}</b>? Customers will immediately lose access to it.`} 
        icon="🚨" 
      />
    </>
  )
}