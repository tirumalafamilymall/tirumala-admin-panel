'use client'
import { useState } from 'react'
import { changeUserRole } from '@/lib/api'
import { Badge, Confirm, UserAvatar, SkeletonRows, toast } from '@/components/admin/ui'

const MOCK_USERS = [
  { id:'u1', name:'Priya Sharma',  email:'priya@gmail.com',   role:'USER',  ordersCount:12, createdAt:'15 Jan 2026' },
  { id:'u2', name:'Ravi Kumar',    email:'ravi@gmail.com',    role:'USER',  ordersCount:7,  createdAt:'22 Feb 2026' },
  { id:'u3', name:'Anita Reddy',   email:'anita@gmail.com',   role:'ADMIN', ordersCount:24, createdAt:'10 Dec 2025' },
  { id:'u4', name:'Suresh Babu',   email:'suresh@gmail.com',  role:'USER',  ordersCount:4,  createdAt:'05 Mar 2026' },
  { id:'u5', name:'Lakshmi Devi',  email:'lakshmi@gmail.com', role:'USER',  ordersCount:19, createdAt:'01 Nov 2025' },
  { id:'u6', name:'Meena Raju',    email:'meena@gmail.com',   role:'USER',  ordersCount:2,  createdAt:'10 Apr 2026' },
  { id:'u7', name:'Kamala T.',     email:'kamala@gmail.com',  role:'USER',  ordersCount:8,  createdAt:'18 Jan 2026' },
]

const MOCK_ORDERS = [
  { id:'TFM-87291', amount:'₹1,299', status:'DELIVERED', date:'18 Apr 2026' },
  { id:'TFM-87240', amount:'₹699',   status:'CANCELLED', date:'5 Apr 2026'  },
  { id:'TFM-87180', amount:'₹2,450', status:'DELIVERED', date:'18 Mar 2026' },
]

export default function UsersPage() {
  const [users, setUsers]         = useState(MOCK_USERS)
  const [loading]                 = useState(false)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<any>(null)
  const [roleConfirm, setRoleConfirm] = useState<any>(null)
  const [saving, setSaving]       = useState(false)

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  async function handleRoleChange() {
    if (!roleConfirm) return
    setSaving(true)
    try {
      const newRole = roleConfirm.role === 'ADMIN' ? 'USER' : 'ADMIN'
      await changeUserRole(roleConfirm.id, newRole)
      setUsers(us => us.map(u => u.id === roleConfirm.id ? { ...u, role: newRole } : u))
      if (selected?.id === roleConfirm.id) setSelected((s: any) => s ? { ...s, role: newRole } : s)
      toast(`Role changed to ${newRole}`, 'success')
    } catch (e: any) { toast(e.message, 'error') }
    setSaving(false)
  }

  if (selected) return (
    <UserDetail
      user={selected}
      orders={MOCK_ORDERS}
      onBack={() => setSelected(null)}
      onRoleChange={() => setRoleConfirm(selected)}
    />
  )

  return (
    <>
      <div className="filter-bar">
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="flt-select">
          <option>All Roles</option><option>USER</option><option>ADMIN</option>
        </select>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>User</th><th>Email</th><th>Orders</th><th>Joined</th><th>Role</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows cols={6} /> : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <UserAvatar name={u.name} />
                      <span style={{ fontWeight:600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:12, color:'var(--ink-4)' }}>{u.email}</td>
                  <td><span className="badge badge-CONFIRMED">{u.ordersCount}</span></td>
                  <td style={{ fontSize:12, color:'var(--ink-5)' }}>{u.createdAt}</td>
                  <td><Badge status={u.role} /></td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-sm" onClick={() => setSelected(u)}>View</button>
                      <button className="btn btn-sm" onClick={() => setRoleConfirm(u)}>Change Role</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Confirm
        open={!!roleConfirm}
        onClose={() => setRoleConfirm(null)}
        onConfirm={handleRoleChange}
        title="Change User Role"
        message={`Change role for <strong>${roleConfirm?.name}</strong> from <strong>${roleConfirm?.role}</strong> to <strong>${roleConfirm?.role === 'ADMIN' ? 'USER' : 'ADMIN'}</strong>?`}
        icon="👤" danger={false} confirmLabel="Confirm"
      />
    </>
  )
}

function UserDetail({ user, orders, onBack, onRoleChange }: any) {
  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button className="btn btn-sm btn-ghost" onClick={onBack}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 2L3 6l4 4"/></svg>
          Back to Users
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:16 }}>
        {/* Profile card */}
        <div className="detail-card" style={{ alignSelf:'start' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
            <UserAvatar name={user.name} size={52} />
            <div>
              <div style={{ fontSize:17, fontWeight:700 }}>{user.name}</div>
              <div style={{ fontSize:12, color:'var(--ink-5)', marginTop:2 }}>{user.email}</div>
            </div>
          </div>
          <div className="divider" />
          <div className="detail-row">
            <span className="detail-lbl">Role</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Badge status={user.role} />
            </div>
          </div>
          <div className="detail-row"><span className="detail-lbl">Joined</span><span className="detail-val">{user.createdAt}</span></div>
          <div className="detail-row"><span className="detail-lbl">Total Orders</span><span className="detail-val" style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--maroon)' }}>{user.ordersCount}</span></div>
          <div style={{ marginTop:14 }}>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={onRoleChange}>
              {user.role === 'ADMIN' ? '⬇️ Demote to User' : '⬆️ Promote to Admin'}
            </button>
          </div>
        </div>

        {/* Order history */}
        <div className="card">
          <div className="card-header"><div className="card-title">Order History</div></div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Order #</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id}>
                    <td><span className="ord-id">{o.id}</span></td>
                    <td style={{ fontWeight:700 }}>{o.amount}</td>
                    <td><Badge status={o.status} /></td>
                    <td style={{ fontSize:11.5, color:'var(--ink-5)' }}>{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
