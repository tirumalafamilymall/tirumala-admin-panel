'use client'
import { useState, useEffect, useCallback } from 'react'
import { getUsers, getUser, changeUserRole } from '@/lib/api'
import { Badge, Confirm, UserAvatar, SkeletonRows, Pagination, toast } from '@/components/admin/ui'

export default function UsersPage() {
  // 1. PREVENT HYDRATION ERROR: Force render only on client
  const [mounted, setMounted] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleConfirm, setRoleConfirm] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const PER_PAGE = 20

  useEffect(() => {
    setMounted(true)
  }, [])

  const load = useCallback(async () => {
    if (!mounted) return
    setLoading(true)
    try {
      const res = await getUsers({ page, search: search || undefined })
      // PERMANENT FIX: Always fallback to empty array
      setUsers(Array.isArray(res?.users) ? res.users : [])
      setTotal(res?.total || 0)
    } catch (e: any) {
      toast(e.message || 'Failed to load users', 'error')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, search, mounted])

  useEffect(() => {
    load()
  }, [load])

  // Debounce search
  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [search])

  async function handleRoleChange() {
    if (!roleConfirm) return
    setSaving(true)
    try {
      const newRole = roleConfirm.role === 'ADMIN' ? 'USER' : 'ADMIN'
      await changeUserRole(roleConfirm.id, newRole)
      setUsers(us => us.map(u => u.id === roleConfirm.id ? { ...u, role: newRole } : u))
      toast(`Role changed to ${newRole}`, 'success')
    } catch (e: any) {
      toast(e.message || 'Failed', 'error')
    } finally {
      setSaving(false)
      setRoleConfirm(null)
    }
  }

  // If not mounted, show a loader to prevent the "Black Screen"
  if (!mounted) {
    return <div className="admin-content"><div className="skeleton" style={{ height: '50vh' }} /></div>
  }

  return (
    <>
      <div className="filter-bar">
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6.5" cy="6.5" r="5" /><path d="M11 11l3 3" />
          </svg>
          <input 
            type="text" 
            placeholder="Search by name or email…" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="card fade-in">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Joined</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={6} />
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-5)' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id || Math.random()}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserAvatar name={u.name || 'U'} />
                        <span style={{ fontWeight: 600 }}>{u.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--ink-4)' }}>{u.email}</td>
                    <td>
                      <span className="badge badge-CONFIRMED">
                        {/* SAFE ACCESS: Prevents crash if _count is missing */}
                        {u._count?.orders ?? 0}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--ink-5)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td><Badge status={u.role || 'USER'} /></td>
                    <td>
                      <button className="btn btn-sm" onClick={() => setRoleConfirm(u)}>
                        Change Role
                      </button>
                    </td>
                  </tr>
                ))
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

      <Confirm
        open={!!roleConfirm}
        onClose={() => setRoleConfirm(null)}
        onConfirm={handleRoleChange}
        title="Change User Role"
        message={`Change role for <strong>${roleConfirm?.name}</strong> to <strong>${roleConfirm?.role === 'ADMIN' ? 'USER' : 'ADMIN'}</strong>?`}
        icon="👤"
        confirmLabel={saving ? 'Updating...' : 'Confirm'}
      />
    </>
  )
}