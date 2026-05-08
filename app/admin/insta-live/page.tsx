'use client'
import { useState, useEffect } from 'react'
import { getInstaLivePosts, createInstaPost, updateInstaPost, deleteInstaPost, linkProduct, unlinkProduct, searchProducts } from '@/lib/api'
import { Modal, Confirm, Toggle, UploadZone, toast } from '@/components/admin/ui'

const emptyForm = { title:'', instagramUrl:'', is_active:true }

export default function InstaLivePage() {
 const [posts, setPosts] = useState<any[]>([])

useEffect(() => {
  loadPosts()
}, [])

async function loadPosts() {
  const data = await getInstaLivePosts()
  setPosts(data)
}
  const [addOpen, setAddOpen]     = useState(false)
  const [editItem, setEditItem]   = useState<any>(null)
  const [form, setForm]           = useState(emptyForm)
  const [errors, setErrors]       = useState<Record<string,string>>({})
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [linkPostId, setLinkPostId] = useState<string|null>(null)
  const [prodSearch, setProdSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [saving, setSaving]       = useState(false)

  function fset(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const errs: Record<string,string> = {}
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
      }

      if (editItem) {
        await updateInstaPost(editItem.id, payload)
        setPosts(ps => ps.map(p => p.id === editItem.id ? { ...p, title: form.title, instagram_url: form.instagramUrl, is_active: form.is_active } : p))
        toast('Post updated', 'success')
      } else {
        await createInstaPost(payload)
        setPosts(ps => [...ps, { id:`il${Date.now()}`, title: form.title, instagram_url: form.instagramUrl, is_active: form.is_active, thumbnail:'📸', products:[] }])
        toast('Post created', 'success')
      }
      setAddOpen(false); setEditItem(null); setForm(emptyForm)
    } catch (e: any) { toast(e.message, 'error') }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteItem) return
    try { await deleteInstaPost(deleteItem.id); setPosts(ps => ps.filter(p => p.id !== deleteItem.id)); toast('Post deleted', 'success') }
    catch (e: any) { toast(e.message, 'error') }
  }

  async function handleSearch(q: string) {
    setProdSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    try { const res = await searchProducts(q); setSearchResults(res.products || []) }
    catch { setSearchResults([]) }
  }

  async function handleLinkProduct(postId: string, product: any) {
    try {
      await linkProduct(postId, product.id)
      setPosts(ps => ps.map(p => p.id === postId && !p.products.find((x: any) => x.id === product.id)
        ? { ...p, products: [...p.products, product] } : p))
      toast('Product linked', 'success')
    } catch (e: any) { toast(e.message, 'error') }
  }

  async function handleUnlinkProduct(postId: string, productId: string) {
    try {
      await unlinkProduct(postId, productId)
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, products: p.products.filter((x: any) => x.id !== productId) } : p))
      toast('Product removed', 'success')
    } catch (e: any) { toast(e.message, 'error') }
  }

  const linkPost = posts.find(p => p.id === linkPostId)

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:12.5, color:'var(--ink-5)' }}>
          {posts.length} posts · <a href="https://instagram.com/tirumalafamilymall777" target="_blank" style={{ color:'var(--maroon)', fontWeight:600 }}>@tirumalafamilymall777</a>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditItem(null); setErrors({}); setAddOpen(true) }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10"/></svg>
          New Live Post
        </button>
      </div>

      <div className="insta-grid">
        {posts.map(p => (
          <div className="insta-card" key={p.id}>
            <div className="insta-thumb" style={{
              background: p.is_active
                ? 'linear-gradient(135deg, var(--maroon-tint), var(--gold-tint))'
                : 'var(--cream-2)'
            }}>
              {p.is_active && <div className="insta-live-badge">● LIVE</div>}
              <span style={{ fontSize:48 }}>{p.thumbnail}</span>
            </div>
            <div className="insta-body">
              <div className="insta-title">{p.title || 'Untitled'}</div>
              <div className="insta-meta">
                {p.products.length} product{p.products.length !== 1 ? 's' : ''} linked ·{' '}
                <span style={{ color: p.is_active ? 'var(--green)' : 'var(--ink-5)', fontWeight:600 }}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="insta-actions">
                <button className="btn btn-xs" onClick={() => {
                  setForm({ title:p.title||'', instagramUrl:p.instagram_url, is_active:p.is_active })
                  setEditItem(p); setErrors({}); setAddOpen(true)
                }}>✏️ Edit</button>
                <button className="btn btn-xs" onClick={() => { setLinkPostId(p.id); setProdSearch(''); setSearchResults([]) }}>🔗 Products</button>
                <button className="btn btn-xs btn-danger" onClick={() => setDeleteItem(p)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}

        <div className="insta-add-card" onClick={() => { setForm(emptyForm); setEditItem(null); setErrors({}); setAddOpen(true) }}>
          <div className="insta-add-icon">+</div>
          <div className="insta-add-label">New Insta Live Post</div>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? 'Edit Post' : 'New Insta Live Post'}
        footer={<>
          <button className="btn" onClick={() => { setAddOpen(false); setEditItem(null) }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create Post'}</button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="fgroup">
            <label className="flabel">Title <span style={{ color:'var(--ink-5)', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
            <input className="finput" placeholder="e.g. Saree Haul Apr 2026" value={form.title} onChange={e => fset('title',e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Instagram URL *</label>
            <input className="finput" type="url" placeholder="https://www.instagram.com/reel/…" value={form.instagramUrl} onChange={e => fset('instagramUrl',e.target.value)} />
            {errors.instagramUrl && <div className="ferror">{errors.instagramUrl}</div>}
          </div>
          <div className="fgroup">
            <label className="flabel">Thumbnail *</label>
            <UploadZone label="Upload thumbnail image" subLabel="JPG or PNG · Square recommended" />
          </div>
          <div className="fgroup" style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <label className="flabel" style={{ margin:0 }}>Active</label>
            <Toggle checked={form.is_active} onChange={v => fset('is_active',v)} />
            <span style={{ fontSize:12, color:'var(--ink-5)' }}>Show on store</span>
          </div>
        </div>
      </Modal>

      <Modal open={!!linkPostId} onClose={() => setLinkPostId(null)} title={`Products — ${linkPost?.title || 'Post'}`} wide
        footer={<button className="btn btn-primary" onClick={() => setLinkPostId(null)}>Done</button>}>
        <div className="fgroup" style={{ marginBottom:12 }}>
          <label className="flabel">Search & Link Products</label>
          <div className="filter-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
            <input type="text" placeholder="Search products…" value={prodSearch} onChange={e => handleSearch(e.target.value)} />
          </div>
        </div>

        {searchResults.length > 0 && (
          <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:14 }}>
            {searchResults.map((r: any) => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderBottom:'1px solid rgba(234,216,204,.4)', fontSize:12.5 }}>
                <span>{r.name} — ₹{(r.base_price ?? 0).toLocaleString('en-IN')}</span>
                <button className="btn btn-xs btn-green" onClick={() => linkPostId && handleLinkProduct(linkPostId, r)}>+ Link</button>
              </div>
            ))}
          </div>
        )}

        <div className="section-title" style={{ marginTop:4 }}>Linked Products ({linkPost?.products.length || 0})</div>
        {linkPost?.products.length === 0
          ? <div style={{ padding:'16px 0', textAlign:'center', color:'var(--ink-5)', fontSize:13 }}>No products linked yet. Search above to link products.</div>
          : <div className="linked-prod-list">
              {linkPost?.products.map((p: any) => (
                <div key={p.id} className="linked-prod-row">
                  <div>
                    <span style={{ fontWeight:500 }}>{p.name}</span>
                    <span style={{ color:'var(--ink-5)', marginLeft:8 }}>₹{(p.base_price ?? p.price ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                  <button className="btn btn-xs btn-danger" onClick={() => linkPostId && handleUnlinkProduct(linkPostId, p.id)}>Remove</button>
                </div>
              ))}
            </div>}
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Delete Post" message={`Delete "${deleteItem?.title || 'this post'}"? This will remove it from the storefront.`}
        icon="🗑️" confirmLabel="Yes, Delete" />
    </>
  )
}