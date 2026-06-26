'use client'
import { useEffect, useState, useCallback } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct, uploadExcel , getCategories } from '@/lib/api'
import { getAdminToken } from '@/lib/auth'
import { API_BASE } from '@/lib/api'
import { Modal, Confirm, Toggle, StockBadge, SkeletonRows, Pagination, UploadZone, toast } from '@/components/admin/ui'

type Product = {
  id: string
  variant_id: string
  product_code: string
  sku: string
  name: string
  department: string 
  category: string
  brand?: string
  base_price: number
  stock: number
  images: string[]
  image?: string
  is_active: boolean
  subcategory?: string
  color?: string
  size?: string
  barcode?: string
  sales_channel?: string 
}

type ExcelResult = {
  created?: number
  updated?: number
  failed?: number
  parseErrors?: number
  failedRows?: { product_code: string; error: string }[]
  parseErrorList?: string[]
}

type ZipResult = {
  summary: { total: number; matched: number; unmatched: number; failed: number }
  details: { product_code: string; status: string; reason?: string }[]
}

const PROD_EMOJIS: Record<string,string> = { Sarees:'🥻', Kurtis:'👗', 'Kids Wear':'👚', 'Men Shirts':'👕', Nightwear:'🌙', Accessories:'💍', default:'🛍️' }

const emptyForm = { product_code:'', name:'', department:'', category:'', subcategory:'', brand:'', price:'', stock:'', color:'', size:'', barcode:'', is_active:true, sales_channel: 'MAIN_STORE', images: [] as string[] }

export default function ProductsPage() {
  const [products,    setProducts]    = useState<Product[]>([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('')
  const [statusFilter,setStatusFilter]= useState('')
  const [instaLiveFilter, setInstaLiveFilter] = useState(false)
  const [page,        setPage]        = useState(1)
  const [addOpen,     setAddOpen]     = useState(false)
  const [editItem,    setEditItem]    = useState<Product | null>(null)
  const [deleteItem,  setDeleteItem]  = useState<Product | null>(null)
  const [form,        setForm]        = useState(emptyForm)
  const [formErrors,  setFormErrors]  = useState<Record<string,string>>({})
  const [excelOpen,   setExcelOpen]   = useState(false)
  const [excelResult, setExcelResult] = useState<ExcelResult | null>(null)
  const [excelLoading, setExcelLoading] = useState(false) 
  const [zipOpen,     setZipOpen]     = useState(false)
  const [zipResult,   setZipResult]   = useState<ZipResult | null>(null)
  const [zipLoading,  setZipLoading]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  

  const PER_PAGE = 10

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProducts({
        page,
        limit:     PER_PAGE,
        search:    search || undefined,
        category:  catFilter || undefined,
        is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        sales_channel: instaLiveFilter ? 'INSTA_LIVE' : undefined, // 🔥 NEW: Passes data target to public API lookup router
      })
      setProducts(res.products ?? [])
      setTotal(res.total ?? 0)
    } catch (e: any) {
      toast(e.message || 'Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, search, catFilter, statusFilter, instaLiveFilter]) // 🔥 NEW: Added hook target dependency monitoring

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadProducts() }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    getCategories()
      .then(data => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => setCategories([]))
  }, [])

  function fset(k: keyof typeof form, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const errs: Record<string,string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.department)  errs.department = 'Department is required'
    if (!form.category)    errs.category = 'Category is required'
    if (!form.price || isNaN(+form.price)) errs.price = 'Valid price required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const [imageUploading, setImageUploading] = useState(false)

async function handleSingleImageUpload(file: File) {
  setImageUploading(true)
  try {
    const imageCompression = (await import('browser-image-compression')).default
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    })

    const token = getAdminToken()
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    
    const initRes = await fetch(`${API_BASE}/api/upload/presign?filename=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}`, { headers })
    const { uploadUrl, publicUrl } = await initRes.json()
    
    if (!uploadUrl) throw new Error('Failed to get upload URL')
    
    const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: compressed, headers: { 'Content-Type': file.type } })
    if (!uploadRes.ok) throw new Error('Failed to upload file to cloud')
    
    setForm(prev => ({ ...prev, images: [publicUrl] }))
    toast('Image uploaded', 'success')
  } catch (e: any) {
    toast(e.message || 'Image upload failed', 'error')
  } finally {
    setImageUploading(false)
  }
}

async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const body = { 
        ...form, 
        variant_id: editItem?.variant_id,
        base_price: +form.price, 
        stock: +form.stock || 0 ,

        image: form.images?.[0] || null
      }
      
if (editItem) {
        // 1. Capture the fresh data sent back from your perfect PATCH route
        await updateProduct(editItem.id, body) 
        
        // 2. INSTANTLY update the React state (Fully Type-Safe!)
        setProducts(currentProducts => 
          currentProducts.map(p => 
            p.variant_id === editItem.variant_id 
              ? { 
                  ...p, 
                  name: form.name,
                  department: form.department,
                  category: form.category,
                  subcategory: form.subcategory,
                  brand: form.brand,
                  base_price: +form.price,
                  stock: +form.stock || 0,
                  color: form.color,
                  size: form.size,
                  barcode: form.barcode,
                  sales_channel: form.sales_channel,
                  is_active: form.is_active,
                  images: form.images,
                  image: form.images?.[0] || undefined // 🔥 undefined instead of null fixes the image TS error!
                }
              : p
          )
        )
        toast('Product updated', 'success')
      } else {
        await createProduct(body)
        toast('Product added', 'success')
      }
      
      setAddOpen(false); setEditItem(null); setForm(emptyForm)
      
      // 3. We still call this, but the user doesn't have to wait for it anymore
      loadProducts() 
    } catch (e: any) { 
      toast(e.message || 'Save failed', 'error') 
    } finally {
      setSaving(false)
    }
  }

  function openEdit(p: Product) {
    setForm({
      product_code: p.product_code || '', 
      name: p.name, department: p.department || '', category: p.category, subcategory: p.subcategory || '',
      brand: p.brand || '', price: String(p.base_price), stock: String(p.stock),
      color: p.color || '', size: p.size || '', barcode: p.barcode || '', is_active: p.is_active,
      sales_channel: p.sales_channel || 'MAIN_STORE', 
      images: p.image ? [p.image] : []
    })
    setEditItem(p); setAddOpen(true)
  }

  async function handleDelete() {
    if (!deleteItem || deleting) return
    setDeleting(true)
    try {
      await deleteProduct(deleteItem.id, deleteItem.variant_id)
      toast('Product deleted', 'success')
      setDeleteItem(null)
      loadProducts()
    } catch (e: any) { 
      toast(e?.message || 'Delete failed', 'error') 
    } finally {
      setDeleting(false)
    }
  }

async function handleExcelFile(file: File) {
  setExcelLoading(true) 
  setExcelResult(null)
  
  try {
    const res = await uploadExcel(file)
    
    const mappedResult = {
      created:       res.summary?.created || 0, 
      updated:       res.summary?.updated || 0, 
      failed:        res.summary?.failed || 0,
      parseErrors:   res.summary?.parse_errors || 0,
      failedRows:    res.failed_rows || [],
      parseErrorList: res.parse_errors || []
    }
    
    setExcelResult(mappedResult)
    
    if (mappedResult.created === 0 && mappedResult.updated === 0 && mappedResult.parseErrors === 0 && mappedResult.failed === 0) {
      toast('Nothing was processed. Check your file format.', 'error')
    } else if (mappedResult.created === 0 && mappedResult.updated === 0) {
      toast(`Nothing created or updated. Parse Errors: ${mappedResult.parseErrors}, Failed: ${mappedResult.failed}`, 'error')
    } else {
      toast(`Created ${mappedResult.created} & Updated ${mappedResult.updated} products`, 'success')
    }
    loadProducts()
  } catch (e: any) { 
    toast(e?.message || 'Upload failed', 'error') 
  } finally {
    setExcelLoading(false) 
  }
}

async function handleZipUpload(file: File) {
    if (file.size > 150 * 1024 * 1024) {
      toast('ZIP file is too large. Please keep it under 150MB.', 'error')
      return
    }

    setZipLoading(true)
    setZipResult(null)
    
    try {
      toast('Extracting ZIP in browser...', 'info')
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      
      const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp']
      const extractedFiles: { productCode: string; fileName: string; mimeType: string; blob: Blob }[] = []

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue
        
        const fileName = relativePath.split('/').pop() || relativePath
        const fileExt  = fileName.split('.').pop()?.toLowerCase() || ''
        if (!ALLOWED_EXTS.includes(fileExt)) continue
        
        const productCode = fileName.replace(/\.[^.]+$/, '').trim()
        if (!productCode) continue

        const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : fileExt === 'png' ? 'image/png' : 'image/webp'
        
        const blob = await zipEntry.async('blob')
        extractedFiles.push({ productCode, fileName, mimeType, blob })
      }

      if (extractedFiles.length === 0) throw new Error('No valid images found in ZIP.')

      toast(`Found ${extractedFiles.length} images. Requesting upload URLs...`, 'info')
      const token = getAdminToken()
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

      const initPayload = extractedFiles.map(({ productCode, fileName, mimeType }) => ({ productCode, fileName, mimeType }))
      const initRes = await fetch(`${API_BASE}/api/admin/products/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'INIT', images: initPayload }),
      })
      
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize uploads')

      const { matched, unmatched } = initData
      const successfulUploads: any[] = []
      let failedCount = 0

      toast(`Uploading ${matched.length} images...`, 'info')
      const imageCompression = (await import('browser-image-compression')).default

      const BATCH_SIZE = 20
      for (let i = 0; i < matched.length; i += BATCH_SIZE) {
        const batch = matched.slice(i, i + BATCH_SIZE)
        
        await Promise.all(batch.map(async (item: any) => {
          const fileData = extractedFiles.find(f => f.productCode === item.productCode)
          if (!fileData) return

          

          try {
const compressedBlob = await imageCompression(new File([fileData.blob], fileData.fileName, { type: fileData.mimeType }), {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
})

const uploadRes = await fetch(item.uploadUrl, {
  method: 'PUT',
  body: compressedBlob,
  headers: { 'Content-Type': fileData.mimeType, 'x-amz-acl': 'public-read' },
})
            
            if (uploadRes.ok) {
              successfulUploads.push({ 
                targetType: item.targetType, 
                targetIds: item.targetIds, 
                publicUrl: item.publicUrl 
              })
            } else {
              failedCount++
            }
          } catch (e) {
            failedCount++
          }
        }))
      }

      toast(`Saving ${successfulUploads.length} images to database...`, 'info')
      const commitRes = await fetch(`${API_BASE}/api/admin/products/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'COMMIT', updates: successfulUploads }),
      })

      const commitData = await commitRes.json()
      if (!commitRes.ok) throw new Error(commitData.error || 'Database update failed')

      setZipResult({
        summary: {
          total: extractedFiles.length,
          matched: successfulUploads.length,
          unmatched: unmatched.length,
          failed: failedCount + (commitData.failed?.length || 0),
        },
        details: unmatched
      })

      toast('Batch upload complete!', 'success')
      loadProducts()

    } catch (e: any) {
      toast(e.message || 'ZIP upload failed', 'error')
    } finally {
      setZipLoading(false)
    }
  }

  async function toggleActive(p: Product) {
    if (togglingId === p.id) return
    setTogglingId(p.id)
    try {
      await updateProduct(p.id, { 
        is_active: !p.is_active,
        variant_id: p.variant_id // Must include this!
      })
      setProducts(ps => ps.map(x => x.variant_id === p.variant_id ? { ...x, is_active: !x.is_active } : x))
      toast('Variant status updated', 'success')
    } catch (e: any) { 
      toast(e?.message || 'Failed', 'error') 
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <>
      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3"/></svg>
          <input type="text" placeholder="Search by name, code, category…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        
        <select className="flt-select" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>

        <select className="flt-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* 🔥 NEW: PREMIUM INSTA LIVE EXCLUSIVE TOGGLE COMPONENT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FCE7F3', padding: '4px 14px', borderRadius: 20, border: '1px solid #FBCFE8', height: 38 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#BE185D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Insta Live Exclusives</span>
          <Toggle checked={instaLiveFilter} onChange={v => { setInstaLiveFilter(v); setPage(1); }} />
        </div>

        <div className="ms-auto" style={{ display:'flex', gap:8 }}>

          <button className="btn" style={{ background:'var(--cream-1)', border:'1px solid var(--border)' }} onClick={() => window.location.href='/coupons'}>
            🎟️ Manage Coupons
          </button>

          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditItem(null); setFormErrors({}); setAddOpen(true) }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10"/></svg>
            Add Product
          </button>
          <button className="btn btn-gold" onClick={() => { setExcelResult(null); setExcelOpen(true) }}>📊 Excel Upload</button>
          <button className="btn" style={{ background:'var(--cream-2)', border:'1px solid var(--border)' }} onClick={() => { setZipResult(null); setZipOpen(true) }}>📸 Images ZIP</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Image</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>SKU / Code</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Name</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Specs</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Dept</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Category</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Price</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Stock</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Status</th>
                <th style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={10} />
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-5)' }}>
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.variant_id || p.id}
                    style={{
                      background: p.stock === 0 ? 'rgba(254,240,240,.4)' : undefined,
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => { if (p.stock !== 0) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--cream-2)' }}
                    onMouseLeave={e => { if (p.stock !== 0) (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                  >
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
<div
  className="prod-thumb"
  style={{
    width: 44,
    height: 44,
    background: p.stock === 0 ? '#FEF0F0' : 'var(--cream-2)',
    cursor: 'zoom-in',
  }}
  onClick={() => (p.image || p.images?.[0]) && setPreviewImage(p.image || p.images[0])}
>
  {/* ✅ THIS IS THE CORRECT WAY TO RENDER THE IMAGE FOR THE CURRENT ROW */}
  {p.image || p.images?.[0] ? (
<img 
  src={p.image || p.images[0]} 
  alt={p.name} 
  loading="lazy"
  decoding="async"
  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} 
/>
  ) : (
    <span style={{ fontSize: 20 }}>{PROD_EMOJIS[p.category] || PROD_EMOJIS.default}</span>
  )}
</div>
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--ink-5)', background: 'var(--cream-2)', padding: '2px 6px', borderRadius: 4 }}>
                          {p.sku || p.product_code}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--ink-3)', marginLeft: 6 }}>Code: {p.product_code}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 600, maxWidth: 200, lineHeight: 1.35 }}>
                      {p.name}
                      {p.sales_channel === 'INSTA_LIVE' && (
                        <span style={{ display: 'inline-block', marginLeft: 8, fontSize: 9, background: '#FCE7F3', color: '#BE185D', padding: '2px 6px', borderRadius: 4, verticalAlign: 'middle' }}>
                          INSTA LIVE
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.size && (
                          <span style={{ fontSize: 10, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, whiteSpace: 'nowrap', background: 'var(--cream-1)' }}>
                            {p.size}
                          </span>
                        )}
                        {p.color && (
                          <span style={{ fontSize: 10, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, whiteSpace: 'nowrap', background: 'var(--cream-1)' }}>
                            {p.color}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <span className={`badge badge-${p.department === 'WOMEN' ? 'DELIVERED' : p.department === 'MEN' ? 'CONFIRMED' : 'PENDING'}`}>
                        {p.department}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <span className="badge badge-USER">{p.category}</span>
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', fontWeight: 700 }}>
                      ₹{p.base_price.toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <StockBadge stock={p.stock} />
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <Toggle checked={p.is_active} onChange={() => toggleActive(p)} disabled={togglingId === p.id} />
                    </td>

                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-sm" onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteItem(p)}>🗑️</button>
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

      {/* Add/Edit Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? `Edit — ${editItem.name}` : 'Add New Product'} wide
        footer={<>
          <button className="btn" onClick={() => { setAddOpen(false); setEditItem(null) }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editItem ? 'Save Changes' : 'Add Product'}</button>
        </>}>
        
        <div className="form-grid">
          <div className="fgroup">
            <label className="flabel">Product Code</label>
            <input 
              className="finput" 
              placeholder="Leave blank to auto-generate" 
              value={form.product_code} 
              onChange={e => fset('product_code', e.target.value.toUpperCase())} 
              disabled={!!editItem} 
            />
          </div>

          <div className="fgroup"><label className="flabel">Name *</label><input className="finput" placeholder="e.g. Silk Blend Saree" value={form.name} onChange={e => fset('name',e.target.value)} />{formErrors.name && <div className="ferror">{formErrors.name}</div>}</div>
          
          <div className="fgroup">
            <label className="flabel">Department *</label>
            <select className="finput" value={form.department} onChange={e => fset('department', e.target.value)}>
              <option value="">Select Department...</option>
              <option value="WOMEN">Women</option>
              <option value="MEN">Men</option>
              <option value="KIDS">Kids</option>
            </select>
            {formErrors.department && <div className="ferror">{formErrors.department}</div>}
          </div>

          <div className="fgroup">
            <label className="flabel">Category *</label>
            <input 
              className="finput" 
              list="category-options" 
              placeholder="Type or select category..." 
              value={form.category} 
              onChange={e => fset('category', e.target.value)} 
            />
            <datalist id="category-options">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
            {formErrors.category && <div className="ferror">{formErrors.category}</div>}
          </div>

          <div className="fgroup"><label className="flabel">Subcategory</label><input className="finput" placeholder="e.g. Silk Sarees" value={form.subcategory} onChange={e => fset('subcategory',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Brand</label><input className="finput" placeholder="Brand name" value={form.brand} onChange={e => fset('brand',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Base Price (₹) *</label><input className="finput" type="number" placeholder="999" value={form.price} onChange={e => fset('price',e.target.value)} />{formErrors.price && <div className="ferror">{formErrors.price}</div>}</div>
          <div className="fgroup"><label className="flabel">Stock Qty</label><input className="finput" type="number" placeholder="0" value={form.stock} onChange={e => fset('stock',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Color</label><input className="finput" placeholder="Red, Blue, Multi…" value={form.color} onChange={e => fset('color',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Size</label><input className="finput" placeholder="S, M, L, XL, Free Size" value={form.size} onChange={e => fset('size',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Barcode</label><input className="finput" placeholder="Scan or enter barcode" value={form.barcode} onChange={e => fset('barcode',e.target.value)} /></div>
          
          <div className="fgroup full">
            <label className="flabel">Product Image</label>
            {form.images && form.images.length > 0 ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={form.images[0]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <button className="btn btn-sm" onClick={() => setForm(f => ({ ...f, images: [] }))} style={{ color: 'var(--red-1)' }}>Remove</button>
              </div>
            ) : imageUploading ? (
              <div style={{ padding: '15px', textAlign: 'center', background: 'var(--cream-2)', borderRadius: 6, fontSize: 13, color: 'var(--ink-4)' }}>⏳ Uploading...</div>
            ) : (
              <UploadZone label="Upload Product Image" subLabel="JPG, PNG, WebP (Max 5MB)" onFile={handleSingleImageUpload} />
            )}
          </div>
          
          <div className="fgroup full" style={{ flexDirection:'row', alignItems:'center', gap:12, background: 'var(--cream-1)', padding: 12, borderRadius: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="flabel" style={{ margin:0, color: '#BE185D' }}>Insta Live Exclusive</label>
              <div style={{ fontSize:11, color:'var(--ink-4)', marginTop: 2 }}>
                Hide from main store. Only visible on the dedicated Insta Live page.
              </div>
            </div>
            <Toggle 
              checked={form.sales_channel === 'INSTA_LIVE'} 
              onChange={v => fset('sales_channel', v ? 'INSTA_LIVE' : 'MAIN_STORE')} 
            />
          </div>

          <div className="fgroup full" style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <label className="flabel" style={{ margin:0 }}>Active</label>
            <Toggle checked={form.is_active} onChange={v => fset('is_active',v)} />
            <span style={{ fontSize:12, color:'var(--ink-5)' }}>Product available for purchase</span>
          </div>
        </div>
      </Modal>

      <Confirm 
        open={!!deleteItem} 
        onClose={() => setDeleteItem(null)} 
        onConfirm={handleDelete}
        title="Delete Product" 
        message={`Delete "${deleteItem?.name}"?`} 
        icon="🗑️" 
        confirmLabel={deleting ? "Deleting..." : "Yes, Delete"} 
      />

{/* Excel Upload Modal */}
      <Modal open={excelOpen} onClose={() => setExcelOpen(false)} title="Excel / CSV Upload" wide
        footer={<button className="btn" onClick={() => setExcelOpen(false)}>Close</button>}>
        
        <div style={{ marginBottom: 18, padding: '12px 16px', background: 'var(--cream-1)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.7 }}>
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: '#9B1C1C' }}>Mandatory Columns:</strong><br/>
            <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>product_code</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>name</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>department</code> (WOMEN/MEN/KIDS), <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>category</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>base_price</code>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Optional Columns:</strong><br/>
            <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>subcategory</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>brand</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>stock</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>color</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>size</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>sku</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>barcode</code>, <code style={{ background: '#fff', padding: '2px 5px', borderRadius: 4 }}>image</code> (URL)
          </div>
          <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, fontSize: 11.5 }}>
            <strong>Tip:</strong> Add a column named <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>sales_channel</code> and enter <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>INSTA_LIVE</code> to make products Instagram Exclusives.
          </div>
        </div>


        {excelLoading ? (
          <div style={{ textAlign:'center', padding:'30px 0', color:'var(--ink-5)', fontSize:13 }}>
            ⏳ Uploading and processing products...
          </div>
        ) : (
          <UploadZone label="Drag & drop your file here" subLabel="Accepts .xlsx · .xls · .csv" onFile={handleExcelFile} />
        )}
        
{excelResult && (
  <div style={{ marginTop:16 }}>
    <div className="excel-result-grid">
      <div className="excel-result-box" style={{ background:'#DCFCE7' }}>
        <div className="excel-result-val" style={{ color:'#14532D' }}>{excelResult.created ?? 0}</div>
        <div className="excel-result-lbl">✓ Created</div>
      </div>
      <div className="excel-result-box" style={{ background:'#DBEAFE' }}>
        <div className="excel-result-val" style={{ color:'#1E3A8A' }}>{excelResult.updated ?? 0}</div>
        <div className="excel-result-lbl">↻ Updated</div>
      </div>
      <div className="excel-result-box" style={{ background:'#FEE2E2' }}>
        <div className="excel-result-val" style={{ color:'#7F1D1D' }}>{excelResult.failed ?? 0}</div>
        <div className="excel-result-lbl">✕ Failed</div>
      </div>
      <div className="excel-result-box" style={{ background:'#FFF7ED' }}>
        <div className="excel-result-val" style={{ color:'#7C2D12' }}>{excelResult.parseErrors ?? 0}</div>
        <div className="excel-result-lbl">⚠ Parse Errors</div>
      </div>
    </div>

    {excelResult.parseErrorList && excelResult.parseErrorList.length > 0 && (
      <div style={{ marginTop: 12, padding: 12, background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
        <p style={{ fontWeight: 600, color: '#991B1B', marginBottom: 8, fontSize: 13 }}>⚠ Parse Errors:</p>
        {excelResult.parseErrorList.map((e, i) => (
          <p key={i} style={{ fontSize: 12, color: '#991B1B', marginBottom: 4 }}>{e}</p>
        ))}
      </div>
    )}

    {excelResult.failedRows && excelResult.failedRows.length > 0 && (
      <div style={{ marginTop: 12, padding: 12, background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
        <p style={{ fontWeight: 600, color: '#991B1B', marginBottom: 8, fontSize: 13 }}>✕ Failed Rows:</p>
        {excelResult.failedRows.map((r, i) => (
          <p key={i} style={{ fontSize: 12, color: '#991B1B', marginBottom: 4 }}>
            <strong>{r.product_code}:</strong> {r.error}
          </p>
        ))}
      </div>
    )}
  </div>
)}
      </Modal>

{/* ZIP Images Modal */}
      <Modal open={zipOpen} onClose={() => setZipOpen(false)} title="Upload Product Images (ZIP)" wide
        footer={<button className="btn" onClick={() => setZipOpen(false)}>Close</button>}>
        
        <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--cream-2)', borderRadius:8, fontSize:12.5, color:'var(--ink-3)', lineHeight:1.7 }}>
          <strong>How it works:</strong><br />
          1. Create a ZIP containing your product images <strong>(Max 150MB limit)</strong><br />
          2. Name each image after its <strong>Product Code</strong> — e.g. <code style={{ background:'#fff', padding:'1px 5px', borderRadius:3 }}>TFM001.jpg</code><br />
          3. Upload the ZIP — images are matched, uploaded to cloud storage, and saved automatically
        </div>

{zipLoading ? (
          <div style={{ textAlign:'center', padding:'30px 0', color:'var(--ink-5)', fontSize:13 }}>
            ⏳ Uploading and processing images…
          </div>
        ) : (
          <>
            {/* 🔥 FIX: Added 150MB limit to the subLabel */}
            <UploadZone label="Drag & drop your ZIP file here" subLabel="ZIP containing JPG/PNG images (Max size: 150MB)" onFile={handleZipUpload} />
          </>
        )}

        {zipResult && (
          <div style={{ marginTop:16 }}>
            <div className="excel-result-grid">
              <div className="excel-result-box" style={{ background:'#DCFCE7' }}>
                <div className="excel-result-val" style={{ color:'#14532D' }}>{zipResult.summary.matched}</div>
                <div className="excel-result-lbl" style={{ color:'#166534' }}>✓ Matched</div>
              </div>
              <div className="excel-result-box" style={{ background:'#FEE2E2' }}>
                <div className="excel-result-val" style={{ color:'#7F1D1D' }}>{zipResult.summary.unmatched}</div>
                <div className="excel-result-lbl" style={{ color:'#991B1B' }}>? Unmatched</div>
              </div>
              <div className="excel-result-box" style={{ background:'#FFF7ED' }}>
                <div className="excel-result-val" style={{ color:'#7C2D12' }}>{zipResult.summary.failed}</div>
                <div className="excel-result-lbl" style={{ color:'#C2410C' }}>✕ Failed</div>
              </div>
              <div className="excel-result-box" style={{ background:'#F3F4F6' }}>
                <div className="excel-result-val" style={{ color:'#111827' }}>{zipResult.summary.total}</div>
                <div className="excel-result-lbl" style={{ color:'#374151' }}>Total</div>
              </div>
            </div>

            {zipResult.details?.filter(d => d.status !== 'success').length > 0 && (
              <div style={{ marginTop:12 }}>
                <div className="section-title">Issues</div>
                <table>
                  <thead><tr><th>Product Code</th><th>Status</th><th>Reason</th></tr></thead>
                  <tbody>
                    {zipResult.details
                      .filter(d => d.status !== 'success')
                      .map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily:'monospace', fontSize:11 }}>{d.product_code}</td>
                          <td><span className={`badge badge-${d.status === 'unmatched' ? 'PENDING' : 'CANCELLED'}`}>{d.status}</span></td>
                          <td style={{ fontSize:11.5, color:'var(--ink-5)' }}>{d.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Lightbox Lightbox Preview */}
      {previewImage && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, zIndex: 9999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            background: 'rgba(20, 10, 10, 0.6)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <button 
            style={{
              position: 'absolute', top: 30, right: 40, width: 44, height: 44,
              background: 'var(--cream-2)', border: 'none', borderRadius: '50%',
              fontSize: 20, cursor: 'pointer', color: 'var(--ink-1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            onClick={() => setPreviewImage(null)}
          >
            ✕
          </button>
          
          <img 
            src={previewImage} 
            alt="Expanded Preview" 
            style={{ 
              maxHeight: '85vh', maxWidth: '90vw', 
              borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              objectFit: 'contain' 
            }} 
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}