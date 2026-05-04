'use client'
import './admin.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logoutAdmin } from '@/lib/auth'

type User = {
  email: string
  role: 'ADMIN'
}
const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', chip: null,
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> },
  { href: '/admin/products',  label: 'Products',  chip: '1,240',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l6-2 6 2v8l-6 2-6-2V4z"/><path d="M8 2v12M2 4l6 2 6-2"/></svg> },
  { href: '/admin/orders',    label: 'Orders',    chip: '12', chipColor: 'amber',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h4"/></svg> },
  { href: '/admin/users',     label: 'Users',     chip: null,
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg> },
  { href: '/admin/insta-live',label: 'Insta Live',chip: null,
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5"/><circle cx="8" cy="8" r="2"/></svg> },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':  'Dashboard',
  '/admin/products':   'Products',
  '/admin/orders':     'Orders',
  '/admin/users':      'Users',
  '/admin/insta-live': 'Insta Live',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)




  const pageTitle = PAGE_TITLES[pathname] || pathname.split('/').pop() || 'Admin'
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleLogout = async () => {
    if (!confirm('Sign out of Admin Panel?')) return
    await logoutAdmin()
    router.replace('/admin/login')
  }



  return (
    <div className="admin-shell">
      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="sb-brand">
          <div className="sb-brand-logo">
            <img
              src="https://tirumala-family-mallv2.vercel.app/logo1.png"
              alt="TFM"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
                const fb = (e.target as HTMLImageElement).nextSibling as HTMLElement
                if (fb) fb.style.display = 'flex'
              }}
            />
            <span className="sb-logo-fallback" style={{ display: 'none' }}>T</span>
          </div>
          <div className="sb-brand-text">
            <div className="sb-brand-name">Tirumala<br />Family Mall</div>
            <div className="sb-brand-loc">Tekkali, Srikakulam</div>
          </div>
        </div>
        <div style={{ paddingLeft: 18, paddingRight: 18 }}>
          <div className="sb-admin-pill">Admin Console</div>
        </div>

        <div className="sb-nav">
          <div className="sb-section">Main Menu</div>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`sb-item ${pathname.startsWith(n.href) ? 'active' : ''}`}>
              <span className="sb-icon">{n.icon}</span>
              {n.label}
              {n.chip && <span className={`sb-chip ${n.chipColor || ''}`}>{n.chip}</span>}
            </Link>
          ))}

          <div className="sb-section" style={{ marginTop: 8 }}>System</div>
          <Link href="https://tirumala-family-mallv2.vercel.app" target="_blank" className="sb-item">
            <span className="sb-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 2h5v5M14 2l-7 7M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"/>
              </svg>
            </span>
            View Store
          </Link>
        </div>

        <div className="sb-footer">
          <div className="sb-user-row">
            <div className="sb-avatar">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="sb-uname">{user?.email || 'Admin'}</div>
              <div className="sb-urole">Super Admin</div>
            </div>
            <button className="sb-logout-btn" onClick={handleLogout} title="Logout">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-title-wrap">
            <div className="topbar-breadcrumb">
              <span className="topbar-bc-root">TFM Admin</span>
              <span className="topbar-bc-sep">›</span>
              <span className="topbar-bc-cur">{pageTitle}</span>
            </div>
            <h1 className="topbar-h1">{pageTitle}</h1>
          </div>
          <div className="topbar-right">
            <div className="topbar-date">{date}</div>
            <div className="topbar-search">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/>
              </svg>
              <input type="text" placeholder="Quick search…" />
            </div>
            <div className="topbar-icon-btn" style={{ position: 'relative' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 1a5 5 0 0 1 5 5v2.5l1 2.5H2l1-2.5V6a5 5 0 0 1 5-5zM6.5 13.5a1.5 1.5 0 0 0 3 0"/>
              </svg>
              <div className="topbar-notif-dot"></div>
            </div>
            <div className="topbar-profile">
              <div className="topbar-p-avatar">{user?.email?.[0]?.toUpperCase()}</div>
              <span className="topbar-p-name">{user?.email || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content">
          {children}
        </main>
      </div>

      {/* Toast container — rendered globally */}
      <div className="toast-wrap" id="tfm-toasts"></div>
    </div>
  )
}
