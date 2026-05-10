'use client'
import { useState, useEffect, useCallback } from 'react'
import { getUsers, getUser, changeUserRole } from '@/lib/api'
import { Badge, Confirm, UserAvatar, SkeletonRows, Pagination, toast } from '@/components/admin/ui'

export default function UsersPage() {
  // 1. THE CRITICAL FIX: Mounted state prevents the Black Screen (Hydration Error)
  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const [selectedOrders, setSelectedOrders] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [roleConfirm, setRoleConfirm] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const PER_PAGE = 20

  useEffect(() => {
    setMounted(true) // Tells the page it's safe to render in the browser
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getUsers({ page, search: search || undefined })
      setUsers(res?.users || [])
      setTotal(res?.total || 0)
    } catch (e: any) { 
      toast(e.message || 'Failed to load users', 'error')
      setUsers([]) 
    } finally { 
      setLoading(false) 
    }
  }, [page, search])

  useEffect(() => { 
    if (mounted) load() 
  }, [load, mounted])

  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [search])

  async function openDetail(user: any) {
    setSelected(user)
    setLoadingDetail(true)
    try {
      const res = await getUser(user.id)
      setSelectedOrders(res?.user?.orders || [])
    } catch { 
      setSelectedOrders([]) 
    } finally { 
      setLoadingDetail(false) 
    }
  }

  async function handleRoleChange() {
    if (!roleConfirm) return
    setSaving(true)
    try {
      const newRole = roleConfirm.role === 'ADMIN' ? 'USER' : 'ADMIN'
      await changeUserRole(roleConfirm.id, newRole)
      setUsers(us => us.map(u => u.id === roleConfirm.id ? { ...u, role: newRole } : u))
      if (selected?.id === roleConfirm.id) setSelected((s: any) => s ? { ...s, role: newRole } : s)
      toast(`Role changed to ${newRole}`, 'success')
    } catch (e: any) { 
      toast(e.message || 'Failed', 'error') 
    } finally {
      setSaving(false)
      setRoleConfirm(null)
    }
  }

  // 2. WHILE LOADING/MOUNTING: Show nothing or a simple loader to avoid the crash
  if (!mounted) return <div className="admin-content"><div className="skeleton" style={{ height: '80vh' }} /></div>

  return (
    <>
      {selected ? (
        /* ── DETAIL VIEW ── */
        <div className="fade-in">
          <button className="btn btn-sm btn-ghost" style={{ marginBottom: 16 }} onClick={() => { setSelected(null); setSelectedOrders([]) }}>
            ← Back to Users
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
            <div className="detail-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <UserAvatar name={selected.name} size={52} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-5)' }}>{selected.email}</div>
                </div>
              </div>
              <div className="detail-row"><span className="detail-lbl">Role</span><Badge status={selected.role} /></div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={() => setRoleConfirm(selected)}>
                {selected.role === 'ADMIN' ? 'Demote' : 'Promote'}
              </button>
            </div>
            <div className="card">
              <div className="card-header">Order History</div>
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Order #</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {loadingDetail ? <tr><td colSpan={3}>Loading...</td></tr> : 
                     selectedOrders?.map((o: any) => (
                      <tr key={o.id}>
                        <td>{o.order_number}</td>
                        <td>₹{o.total_amount}</td>
                        <td><Badge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="fade-in">
          <div className="filter-bar">
            <input className="finput" style={{ maxWidth: 300 }} placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="card">
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>User</th><th>Email</th><th>Orders</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? <SkeletonRows cols={5} /> : 
                   users?.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u._count?.orders || 0}</td>
                      <td><Badge status={u.role} /></td>
                      <td>
                        <button className="btn btn-sm" onClick={() => openDetail(u)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={Math.ceil(total / PER_PAGE)} perPage={PER_PAGE} totalItems={total} onChange={setPage} />
          </div>
        </div>
      )}

      <Confirm
        open={!!roleConfirm}
        onClose={() => setRoleConfirm(null)}
        onConfirm={handleRoleChange}
        title="Change Role"
        message={`Change role for ${roleConfirm?.name}?`}
        confirmLabel={saving ? 'Saving...' : 'Confirm'}
      />
    </>
  )
}