'use client'
import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

/* ── TOAST ────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'info' | 'warning'

export function toast(msg: string, type: ToastType = 'info') {
  if (typeof window === 'undefined') return
  const wrap = document.getElementById('tfm-toasts')
  if (!wrap) return
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }
  el.innerHTML = `<span style="font-size:15px;flex-shrink:0">${icons[type]}</span><span>${msg}</span>`
  wrap.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300) }, 3500)
}

/* ── MODAL ────────────────────────────────────── */
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
  small?: boolean
}

export function Modal({ open, onClose, title, children, footer, wide, small }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${wide ? 'modal-box-wide' : ''} ${small ? 'modal-box-sm' : ''}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

/* ── CONFIRM ──────────────────────────────────── */
interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  icon?: string
  danger?: boolean
  confirmLabel?: string
}

export function Confirm({ open, onClose, onConfirm, title, message, icon = '⚠️', danger = true, confirmLabel = 'Confirm' }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title="" small
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose() }}>
            {confirmLabel}
          </button>
        </>
      }>
      <div className="confirm-body">
        <div className="confirm-icon">{icon}</div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-msg" dangerouslySetInnerHTML={{ __html: message }} />
      </div>
    </Modal>
  )
}

/* ── BADGE ────────────────────────────────────── */
export function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toUpperCase()}`}>{status}</span>
}

/* ── STOCK CELL ───────────────────────────────── */
export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="stk stk-out">Out</span>
  if (stock <= 5)  return <span className="stk stk-low">{stock} low</span>
  return <span className="stk stk-ok">{stock}</span>
}

/* ── SKELETON ROWS ────────────────────────────── */
export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
          ))}
        </tr>
      ))}
    </>
  )
}

/* ── PAGINATION ───────────────────────────────── */
export function Pagination({ page, total, perPage, totalItems, onChange }: {
  page: number; total: number; perPage: number; totalItems: number; onChange: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(totalItems / perPage))
  const from = (page - 1) * perPage + 1
  const to   = Math.min(page * perPage, totalItems)

  return (
    <div className="pagination">
      <div className="pg-info">Showing {from}–{to} of {totalItems.toLocaleString()}</div>
      <div className="pg-btns">
        <div className={`pg-btn ${page <= 1 ? 'disabled' : ''}`} onClick={() => page > 1 && onChange(page - 1)}>‹</div>
        {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
          const p = i + 1
          return <div key={p} className={`pg-btn ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</div>
        })}
        {pages > 5 && <div className="pg-btn" style={{ width: 'auto', padding: '0 8px' }}>…</div>}
        {pages > 5 && <div className="pg-btn" onClick={() => onChange(pages)}>{pages}</div>}
        <div className={`pg-btn ${page >= pages ? 'disabled' : ''}`} onClick={() => page < pages && onChange(page + 1)}>›</div>
      </div>
    </div>
  )
}

/* ── TOGGLE ───────────────────────────────────── */
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider"></span>
    </label>
  )
}

/* ── UPLOAD ZONE ──────────────────────────────── */
export function UploadZone({ label, subLabel, onFile }: { label: string; subLabel?: string; onFile?: (f: File) => void }) {
  return (
    <div className="upload-zone" onClick={() => {
      const inp = document.createElement('input')
      inp.type = 'file'
      inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f && onFile) onFile(f) }
      inp.click()
    }}>
      <div className="upload-zone-icon">🖼️</div>
      <div className="upload-zone-title">{label}</div>
      {subLabel && <div className="upload-zone-sub">{subLabel}</div>}
    </div>
  )
}

/* ── USER AVATAR ──────────────────────────────── */
const AVATAR_COLORS = ['#7A1C1C','#1A4A8A','#1A7A42','#5C1A8A','#C4922A','#C46A00','#C42828']
export function UserAvatar({ name, size = 34 }: { name: string; size?: number }) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div className="u-avatar" style={{
      width: size, height: size, background: color,
      fontSize: Math.round(size * 0.38),
    }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}
