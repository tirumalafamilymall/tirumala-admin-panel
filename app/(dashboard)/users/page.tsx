'use client'
import { useState, useEffect, useCallback } from 'react'
import { getUsers, getUser, changeUserRole } from '@/lib/api'
import { Badge, Confirm, UserAvatar, SkeletonRows, Pagination, toast } from '@/components/admin/ui'

export default function UsersPage() {
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getUsers({ page, search: search || undefined })
      // Use optional chaining and fallback to empty array
      setUsers(res?.users || [])
      setTotal(res?.total || 0)
    } catch (e: any) { 
      toast(e.message || 'Failed to load users', 'error')
      setUsers([]) 
    } finally { 
      setLoading(false) 
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  // Debounce search to prevent excessive API calls
  useEffect(() => {
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
      
      // Update local state
      setUsers(us => us.map(u => u.id === roleConfirm.id ? { ...u, role: newRole } : u))
      if (selected?.id === roleConfirm.id) setSelected((s: any) => s ? { ...s, role: newRole } : s)
      
      toast(`Role changed to ${newRole}`, 'success')
    } catch (e: any) { 
      toast(e.message || 'Failed to change role', 'error') 
    } finally {
      setSaving(false)
      setRoleConfirm(null)
    }
  }

  // Final rendering logic using a single return and a ternary operator
  return (
    <>
      {selected ? (
        /* ── USER DETAIL VIEW ── */
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => { setSelected(null); setSelectedOrders([]) }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 2L3 6l4 4"/></svg>
              Back to Users
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
            <div className="detail-card" style={{ alignSelf: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <UserAvatar name={selected.name} size={52} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-5)', marginTop: 2 }}>{selected.email}</div>
                </div>
              </div>
              <div className="divider" />
              <div className="detail-row"><span className="detail-lbl">Role</span><Badge status={selected.role} /></div>
              <div className="detail-row"><span className="detail-lbl">Joined</span><span className="detail-val">{selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-IN') : 'N/A'}</span></div>
              <div className="detail-row"><span className="detail-lbl">Total Orders</span><span className="detail-val" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>{selectedOrders?.length || 0}</span></div>
              <div style={{ marginTop: 14 }}>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setRoleConfirm(selected)} disabled={saving}>
                  {selected.role === 'ADMIN' ? '⬇️ Demote to User' : '⬆️ Promote to Admin'}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Order History</div></div>
              {loadingDetail ? (
                <div style={{ padding: 20 }}><div className="skeleton" style={{ height: 100 }} /></div>
              ) : (
                <div className="tbl-wrap">
                  <table>
                    <thead><tr><th>Order #</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {!selectedOrders || selectedOrders.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--ink-5)' }}>No orders yet</td></tr>
                      ) : (
                        selectedOrders.map((o: any) => (
                          <tr key={o.id}>
                            <td><span className="ord-id">{o.order_number}</span></td>
                            <td style={{ fontWeight: 700 }}>₹{Number(o.total_amount || 0).toLocaleString('en-IN')}</td>
                            <td><Badge status={o.status} /></td>
                            <td style={{ fontSize: 11.5, color: 'var(--ink-5)' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── USER LIST VIEW ── */
        <div className="fade-in">
          <div className="filter-bar">
            <div className="filter-search">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
              <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>User</th><th>Email</th><th>Orders</th><th>Joined</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows cols={6} />
                  ) : !users || users.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-5)' }}>No users found</td></tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><UserAvatar name={u.name} /><span style={{ fontWeight: 600 }}>{u.name}</span></div></td>
                        <td style={{ fontSize: 12, color: 'var(--ink-4)' }}>{u.email}</td>
                        <td><span className="badge badge-CONFIRMED">{u._count?.orders ?? 0}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--ink-5)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td><Badge status={u.role} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button className="btn btn-sm" onClick={() => openDetail(u)}>View</button>
                            <button className="btn btn-sm" onClick={() => setRoleConfirm(u)}>Change Role</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={Math.ceil(total / PER_PAGE)} perPage={PER_PAGE} totalItems={total} onChange={setPage} />
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Confirm
        open={!!roleConfirm}
        onClose={() => setRoleConfirm(null)}
        onConfirm={handleRoleChange}
        title="Change User Role"
        message={`Change role for <strong>${roleConfirm?.name}</strong> from <strong>${roleConfirm?.role}</strong> to <strong>${roleConfirm?.role === 'ADMIN' ? 'USER' : 'ADMIN'}</strong>?`}
        icon="👤"
        danger={false}
        confirmLabel={saving ? 'Updating...' : 'Confirm'}
      />
    </>
  )
}