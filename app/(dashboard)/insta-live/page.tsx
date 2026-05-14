'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link' // 🔥 Added Next.js Link
// 🔥 Changed searchProducts to searchProductsForLink
import { getInstaLivePosts, createInstaPost, updateInstaPost, deleteInstaPost, linkProduct, unlinkProduct, searchProductsForLink } from '@/lib/api'
import { Modal, Confirm, Toggle, toast } from '@/components/admin/ui'
import { Camera, Link as LinkIcon, Trash2, Search, Package, ExternalLink, Loader2 } from 'lucide-react'

const emptyForm = { title: '', instagramUrl: '', is_active: true }

export default function InstaLivePage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    setLoading(true)
    try {
      const res = await getInstaLivePosts()
      setPosts(res?.posts || [])
    } catch (e: any) {
      toast(e.message || 'Failed to load posts', 'error')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [linkPostId, setLinkPostId] = useState<string | null>(null)
  const [prodSearch, setProdSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  function fset(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.instagramUrl.trim()) errs.instagramUrl = 'Instagram URL is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title || undefined,
        instagram_url: form.instagramUrl,
        is_active: form.is_active,
        thumbnail: '📸' 
      }

      if (editItem) {
        await updateInstaPost(editItem.id, payload)
        toast('Post updated', 'success')
      } else {
        await createInstaPost(payload)
        toast('Post created', 'success')
      }
      setAddOpen(false); setEditItem(null); setForm(emptyForm)
      loadPosts() 
    } catch (e: any) { toast(e.message, 'error') }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteItem) return
    try { 
      await deleteInstaPost(deleteItem.id)
      toast('Post deleted', 'success')
      setDeleteItem(null)
      loadPosts()
    } catch (e: any) { toast(e.message, 'error') }
  }

  async function handleSearch(q: string) {
    setProdSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    try { 
      // 🔥 FIX: Now uses the Admin search so it can find hidden INSTA_LIVE products!
      const res = await searchProductsForLink(q)
      setSearchResults(res.products || []) 
    } catch { setSearchResults([]) }
  }

  async function handleLinkProduct(postId: string, product: any) {
    try {
      await linkProduct(postId, product.id)
      toast('Product linked', 'success')
      loadPosts()
    } catch (e: any) { toast(e.message, 'error') }
  }

  async function handleUnlinkProduct(postId: string, productId: string) {
    try {
      await unlinkProduct(postId, productId)
      toast('Product removed', 'success')
      loadPosts()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const linkPost = posts?.find(p => p.id === linkPostId)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={16} /> <strong>{posts?.length || 0}</strong> Live Sessions
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* 🔥 NEW: Quick link to go upload products */}
          <Link href="/products" className="btn" style={{ background: 'var(--cream-2)', border: '1px solid var(--border)' }}>
            📦 Upload Products
          </Link>
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditItem(null); setErrors({}); setAddOpen(true) }}>
            + New Live Post
          </button>
        </div>
      </div>

      <div className="insta-grid">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin mx-auto" /></div>
        ) : posts?.length > 0 ? (
          posts.map(p => (
            <div className="insta-card" key={p.id}>
              <div className="insta-thumb" style={{
                background: p.is_active ? 'linear-gradient(135deg, #7A1C1C, #C4922A)' : 'var(--cream-2)'
              }}>
                {p.is_active && <div className="insta-live-badge">● LIVE</div>}
                <span style={{ fontSize: 48 }}>{p.thumbnail || '📸'}</span>
              </div>
              <div className="insta-body">
                <div className="insta-title">{p.title || 'Untitled Session'}</div>
                <div className="insta-meta">
                  {p.products?.length || 0} Products Linked
                </div>
                <div className="insta-actions">
                  <button className="btn btn-xs" onClick={() => {
                    setForm({ title: p.title || '', instagramUrl: p.instagram_url, is_active: p.is_active })
                    setEditItem(p); setErrors({}); setAddOpen(true)
                  }}>Edit</button>
                  <button className="btn btn-xs" onClick={() => { setLinkPostId(p.id); setProdSearch(''); setSearchResults([]) }}>
                    <LinkIcon size={12}/> Products
                  </button>
                  <button className="btn btn-xs btn-danger" onClick={() => setDeleteItem(p)}><Trash2 size={12}/></button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="insta-add-card" onClick={() => setAddOpen(true)}>
            <div className="insta-add-icon">+</div>
            <div className="insta-add-label">Setup First Post</div>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? 'Update Session' : 'New Instagram Live'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 0' }}>
          <div className="fgroup">
            <label className="flabel">Session Title</label>
            <input className="finput" placeholder="e.g. Silk Saree Special" value={form.title} onChange={e => fset('title', e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Instagram URL</label>
            <input className="finput" type="url" placeholder="https://www.instagram.com/reel/..." value={form.instagramUrl} onChange={e => fset('instagramUrl', e.target.value)} />
            {errors.instagramUrl && <div className="ferror">{errors.instagramUrl}</div>}
          </div>
          <div className="fgroup" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <label className="flabel" style={{ margin: 0 }}>Active on Store</label>
            <Toggle checked={form.is_active} onChange={v => fset('is_active', v)} />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 10 }}>
            {saving ? 'Processing...' : 'Save Session'}
          </button>
        </div>
      </Modal>

      <Modal open={!!linkPostId} onClose={() => setLinkPostId(null)} title="Link Products to Session" wide>
        <div className="fgroup" style={{ marginBottom: 16 }}>
          <div className="filter-search">
            <Search size={14} />
            <input type="text" placeholder="Search by name or code..." value={prodSearch} onChange={e => handleSearch(e.target.value)} />
          </div>
        </div>

        {searchResults?.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20, background: 'var(--cream-1)' }}>
            {searchResults.map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {r.name} 
                    {/* 🔥 Shows a badge in search so you know it's an exclusive */}
                    {r.sales_channel === 'INSTA_LIVE' && <span style={{ marginLeft: 6, fontSize: 9, color: '#BE185D', background: '#FCE7F3', padding: '2px 4px', borderRadius: 4 }}>EXCLUSIVE</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-5)', background: 'var(--cream-3)', padding: '2px 6px', borderRadius: 4 }}>{r.category}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>₹{Number(r.base_price || 0).toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: 10, color: r.stock > 0 ? 'var(--green)' : 'var(--maroon)' }}>
                       {r.stock > 0 ? `${r.stock} in stock` : 'Out of Stock'}
                    </span>
                  </div>
                </div>
                <button className="btn btn-xs btn-primary" onClick={() => linkPostId && handleLinkProduct(linkPostId, r)}>+ Link</button>
              </div>
            ))}
          </div>
        )}

        <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>Currently Linked ({linkPost?.products?.length || 0})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!linkPost?.products?.length ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No products linked to this session.</div>
          ) : linkPost.products.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'white', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Package size={14} style={{ color: 'var(--ink-4)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.product?.name || p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-5)' }}>
                    ₹{Number(p.product?.base_price || 0).toLocaleString('en-IN')} · {p.product?.stock} Total Stock
                  </div>
                </div>
              </div>
              <button className="btn btn-xs btn-danger" onClick={() => linkPostId && handleUnlinkProduct(linkPostId, p.product?.id || p.id)}>Unlink</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button className="btn" onClick={() => setLinkPostId(null)}>Close</button>
        </div>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Remove Session" message="Are you sure you want to delete this Instagram Live session?" />
    </>
  )
}