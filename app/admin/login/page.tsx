'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdmin } from '@/lib/auth'
import '../admin.css' 

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter email and password.'); return }
    setLoading(true); setError('')
    try {
      await loginAdmin(email, password)
      router.replace('/admin/dashboard')
    } catch (err: any) {
      if (err.message === 'ACCESS_DENIED') setError('Access denied. Only admins can sign in.')
      else setError('Invalid credentials. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-wrap">
        <div className="login-head">
          <img
            className="login-logo"
            src="https://tirumala-family-mallv2.vercel.app/logo1.png"
            alt="TFM"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
              const fb = (e.target as HTMLImageElement).nextSibling as HTMLElement
              if (fb) fb.style.display = 'flex'
            }}
          />
          <div className="login-logo-fallback" style={{ display: 'none' }}>T</div>
          <div className="login-brand">Tirumala Family Mall</div>
          <div className="login-sub">Admin Control Panel</div>
        </div>
        <div className="login-body">
          <div className={`error-banner ${error ? 'show' : ''}`}>{error}</div>
          <form onSubmit={handleLogin}>
            <div className="fgroup" style={{ marginBottom: 14 }}>
              <label className="flabel">Email Address</label>
              <input className="finput" type="email" placeholder="admin@tfm.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="fgroup" style={{ marginBottom: 18 }}>
              <label className="flabel">Password</label>
              <input className="finput" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In to Admin Panel'}
            </button>
          </form>
          <div className="login-note">🔒 Restricted access — Admins only</div>
        </div>
      </div>
    </div>
  )
}
