'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link' 
import { getInstaLivePosts, createInstaPost, updateInstaPost, deleteInstaPost, linkProduct, unlinkProduct, searchProductsForLink } from '@/lib/api'
import { getAdminToken } from '@/lib/auth' 
import { API_BASE } from '@/lib/api'
import { Modal, Confirm, Toggle, UploadZone, toast } from '@/components/admin/ui' 
import { Camera, Link as LinkIcon, Trash2, Search, Package, Loader2 } from 'lucide-react'

const emptyForm = { title: '', instagramUrl: '', thumbnail: '', is_active: true }

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
  
  // 🔥 Media Upload State
  const [uploadingMedia, setUploadingMedia] = useState(false) 
  
  // 🔥 NEW: Specific Product Linking Loading States
  const [linkingProductId, setLinkingProductId] = useState<string | null>(null)
  const [unlinkingProductId, setUnlinkingProductId] = useState<string | null>(null)

  function fset(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.instagramUrl.trim()) errs.instagramUrl = 'Instagram URL is required'
    if (!form.thumbnail.trim()) errs.thumbnail = 'A preview video or image is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleMediaUpload(file: File) {
    setUploadingMedia(true)
    try {
      const token = getAdminToken()
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      
      const initRes = await fetch(`${API_BASE}/api/upload/presign?filename=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}`, { headers })
      const { uploadUrl, publicUrl } = await initRes.json()
      
      if (!uploadUrl) throw new Error('Failed to get upload URL')
      
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type,'x-amz-acl': 'public-read' } })
      if (!uploadRes.ok) throw new Error('Failed to upload file to cloud')
      
      fset('thumbnail', publicUrl)
      toast('Media uploaded successfully', 'success')
    } catch (e: any) {
      toast(e.message || 'Media upload failed', 'error')
    } finally {
      setUploadingMedia(false)
    }
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title || undefined,
        instagram_url: form.instagramUrl,
        is_active: form.is_active,
        thumbnail: form.thumbnail 
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
      const res = await searchProductsForLink(q)
      setSearchResults(res.products || []) 
    } catch { setSearchResults([]) }
  }

  // 🔥 ADDED LOADING TO LINK FUNCTION
  async function handleLinkProduct(postId: string, product: any) {
    setLinkingProductId(product.id)
    try {
      await linkProduct(postId, product.id)
      toast('Product linked', 'success')
      await loadPosts() // Refresh backend data to update currently linked list
    } catch (e: any) { 
      toast(e.message, 'error') 
    } finally {
      setLinkingProductId(null)
    }
  }

  // 🔥 ADDED LOADING TO UNLINK FUNCTION
  async function handleUnlinkProduct(postId: string, productId: string) {
    setUnlinkingProductId(productId)
    try {
      await unlinkProduct(postId, productId)
      toast('Product removed', 'success')
      await loadPosts() // Refresh backend data
    } catch (e: any) { 
      toast(e.message, 'error') 
    } finally {
      setUnlinkingProductId(null)
    }
  }

  const linkPost = posts?.find(p => p.id === linkPostId)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={16} /> <strong>{posts?.length || 0}</strong> Live Sessions
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
          <div style={{ padding: 40, textAlign: 'center', width: '100%', gridColumn: '1 / -1' }}>
            <Loader2 className="animate-spin mx-auto text-(--ink-4)" size={32} />
          </div>
        ) : posts?.length > 0 ? (
          posts.map(p => (
            <div className="insta-card" key={p.id}>
              <div className="insta-thumb" style={{
                background: p.is_active ? 'linear-gradient(135deg, #7A1C1C, #C4922A)' : 'var(--cream-2)'
              }}>
                {p.is_active && <div className="insta-live-badge">● LIVE</div>}
                
{p.thumbnail?.includes('.mp4') ? (
  <video 
    src={p.thumbnail} 
    loop 
    muted 
    playsInline
    preload="metadata"
    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, cursor: 'pointer' }}
    onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
    onMouseLeave={e => { 
      const v = e.currentTarget as HTMLVideoElement
      v.pause()
      v.currentTime = 0
    }}
  />
) : (
  <img src={p.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
)}

              </div>
              <div className="insta-body">
                <div className="insta-title">{p.title || 'Untitled Session'}</div>
                <div className="insta-meta">
                  {p.products?.length || 0} Products Linked
                </div>
                <div className="insta-actions">
                  <button className="btn btn-xs" onClick={() => {
                    setForm({ title: p.title || '', instagramUrl: p.instagram_url, thumbnail: p.thumbnail || '', is_active: p.is_active })
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
          
          <div className="fgroup full">
            <label className="flabel">10-Second Video Preview (or Image) *</label>
            {form.thumbnail ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 80, height: 100, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {form.thumbnail.includes('.mp4') ? (
                  <video src={form.thumbnail} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={form.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <button className="btn btn-sm" onClick={() => fset('thumbnail', '')} style={{ color: 'var(--red-1)' }}>Remove</button>
              </div>
            ) : uploadingMedia ? (
              // 🔥 UPDATED UPLOAD SPINNER
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '15px', background: 'var(--cream-2)', borderRadius: 6, fontSize: 13, color: 'var(--ink-4)' }}>
                <Loader2 size={16} className="animate-spin" /> Uploading to Cloud...
              </div>
            ) : (
              <UploadZone label="Upload 10s Clip" subLabel=".mp4, .jpg, .png (Keep under 5MB for speed)" onFile={handleMediaUpload} />
            )}
            {errors.thumbnail && <div className="ferror">{errors.thumbnail}</div>}
          </div>

          <div className="fgroup">
            <label className="flabel">Session Title</label>
            <input className="finput" placeholder="e.g. Silk Saree Special" value={form.title} onChange={e => fset('title', e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Instagram URL *</label>
            <input className="finput" type="url" placeholder="https://www.instagram.com/reel/..." value={form.instagramUrl} onChange={e => fset('instagramUrl', e.target.value)} />
            {errors.instagramUrl && <div className="ferror">{errors.instagramUrl}</div>}
          </div>
          <div className="fgroup" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <label className="flabel" style={{ margin: 0 }}>Active on Store</label>
            <Toggle checked={form.is_active} onChange={v => fset('is_active', v)} />
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploadingMedia} style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
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
                
                {/* 🔥 LINKING PRODUCT BUTTON WITH SPINNER */}
                <button 
                  className="btn btn-xs btn-primary" 
                  disabled={linkingProductId === r.id}
                  onClick={() => linkPostId && handleLinkProduct(linkPostId, r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {linkingProductId === r.id ? <Loader2 size={12} className="animate-spin" /> : '+'}
                  {linkingProductId === r.id ? 'Linking...' : 'Link'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>Currently Linked ({linkPost?.products?.length || 0})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!linkPost?.products?.length ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No products linked to this session.</div>
          ) : linkPost.products.map((p: any) => {
            const currentProductId = p.product?.id || p.id
            return (
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
                
                {/* 🔥 UNLINKING PRODUCT BUTTON WITH SPINNER */}
                <button 
                  className="btn btn-xs btn-danger" 
                  disabled={unlinkingProductId === currentProductId}
                  onClick={() => linkPostId && handleUnlinkProduct(linkPostId, currentProductId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {unlinkingProductId === currentProductId ? <Loader2 size={12} className="animate-spin" /> : null}
                  {unlinkingProductId === currentProductId ? 'Unlinking...' : 'Unlink'}
                </button>
              </div>
            )
          })}
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