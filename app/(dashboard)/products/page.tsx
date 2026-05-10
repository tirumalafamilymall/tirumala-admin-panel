'use client'
import { useEffect, useState, useCallback } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct, bulkUploadJSON, uploadExcel } from '@/lib/api'
import { getAdminToken } from '@/lib/auth'
import { API_BASE } from '@/lib/api'
import { Modal, Confirm, Toggle, StockBadge, SkeletonRows, Pagination, UploadZone, toast } from '@/components/admin/ui'

type Product = {
  id: string
  product_code: string
  name: string
  category: string
  brand?: string
  base_price: number
  stock: number
  images: string[]
  is_active: boolean
  subcategory?: string
  color?: string
  size?: string
  barcode?: string
}

type ExcelResult = {
  created?: number; updated?: number; failed?: number
  parseErrors?: number; failedRows?: { row: number; reason: string }[]
}

type ZipResult = {
  summary: { total: number; matched: number; unmatched: number; failed: number }
  details: { product_code: string; status: string; reason?: string }[]
}

const CATS = ['Sarees','Kurtis','Dress Materials','Nightwear','Men Shirts','Kids Wear','Accessories','Innerwear']
const PROD_EMOJIS: Record<string,string> = { Sarees:'🥻', Kurtis:'👗', 'Kids Wear':'👚', 'Men Shirts':'👕', Nightwear:'🌙', Accessories:'💍', default:'🛍️' }
const emptyForm = { name:'', category:'', subcategory:'', brand:'', price:'', stock:'', color:'', size:'', barcode:'', is_active:true }

export default function ProductsPage() {
  const [products,    setProducts]    = useState<Product[]>([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('')
  const [statusFilter,setStatusFilter]= useState('')
  const [page,        setPage]        = useState(1)
  const [addOpen,     setAddOpen]     = useState(false)
  const [editItem,    setEditItem]    = useState<Product | null>(null)
  const [deleteItem,  setDeleteItem]  = useState<Product | null>(null)
  const [form,        setForm]        = useState(emptyForm)
  const [formErrors,  setFormErrors]  = useState<Record<string,string>>({})
  const [excelOpen,   setExcelOpen]   = useState(false)
  const [excelResult, setExcelResult] = useState<ExcelResult | null>(null)
  const [zipOpen,     setZipOpen]     = useState(false)
  const [zipResult,   setZipResult]   = useState<ZipResult | null>(null)
  const [zipLoading,  setZipLoading]  = useState(false)
  const [saving,      setSaving]      = useState(false)

  const PER_PAGE = 20

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getProducts({
        page,
        limit:     PER_PAGE,
        search:    search || undefined,
        category:  catFilter || undefined,
        is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      })
      setProducts(res.products ?? [])
      setTotal(res.total ?? 0)
    } catch (e: any) {
      toast(e.message || 'Failed to load products', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, search, catFilter, statusFilter])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadProducts() }, 400)
    return () => clearTimeout(t)
  }, [search])

  function fset(k: keyof typeof form, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const errs: Record<string,string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.category)    errs.category = 'Category is required'
    if (!form.price || isNaN(+form.price)) errs.price = 'Valid price required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const body = { ...form, base_price: +form.price, stock: +form.stock || 0 }
      if (editItem) {
        await updateProduct(editItem.id, body)
        toast('Product updated', 'success')
      } else {
        await createProduct(body)
        toast('Product added', 'success')
      }
      setAddOpen(false); setEditItem(null); setForm(emptyForm)
      loadProducts()
    } catch (e: any) { toast(e.message || 'Save failed', 'error') }
    setSaving(false)
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name, category: p.category, subcategory: p.subcategory || '',
      brand: p.brand || '', price: String(p.base_price), stock: String(p.stock),
      color: p.color || '', size: p.size || '', barcode: p.barcode || '', is_active: p.is_active,
    })
    setEditItem(p); setAddOpen(true)
  }

  async function handleDelete() {
    if (!deleteItem) return
    try {
      await deleteProduct(deleteItem.id)
      toast('Product deleted', 'success')
      loadProducts()
    } catch (e: any) { toast(e?.message || 'Delete failed', 'error') }
  }


  async function handleExcelFile(file: File) {
    try {
      const result = await uploadExcel(file) as ExcelResult
      setExcelResult(result)
      toast(`Created ${result.created ?? 0}, Updated ${result.updated ?? 0}`, 'success')
      loadProducts()
    } catch (e: any) { toast(e?.message || 'Upload failed', 'error') }
  }

async function handleZipUpload(file: File) {
    setZipLoading(true)
    setZipResult(null)
    
    try {
      toast('Extracting ZIP in browser...', 'info')
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      
      const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp']
      const extractedFiles: { productCode: string; fileName: string; mimeType: string; blob: Blob }[] = []

      // 1. Extract files directly into browser memory
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

      // 2. Ask backend for Presigned URLs
      const initPayload = extractedFiles.map(({ productCode, fileName, mimeType }) => ({ productCode, fileName, mimeType }))
      const initRes = await fetch(`${API_BASE}/api/admin/products/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'INIT', images: initPayload }),
      })
      
      const initData = await initRes.json()
      if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize uploads')

      const { matched, unmatched } = initData
      const successfulUploads: { productId: string; publicUrl: string }[] = []
      let failedCount = 0

      toast(`Uploading ${matched.length} images to cloud...`, 'info')

      // 3. Upload directly to DigitalOcean from the browser (Batching to prevent network stalls)
      const BATCH_SIZE = 20
      for (let i = 0; i < matched.length; i += BATCH_SIZE) {
        const batch = matched.slice(i, i + BATCH_SIZE)
        
        await Promise.all(batch.map(async (item: any) => {
          const fileData = extractedFiles.find(f => f.productCode === item.productCode)
          if (!fileData) return

          try {
            const uploadRes = await fetch(item.uploadUrl, {
              method: 'PUT',
              body: fileData.blob,
              headers: { 'Content-Type': fileData.mimeType },
            })
            if (uploadRes.ok) {
              successfulUploads.push({ productId: item.productId, publicUrl: item.publicUrl })
            } else {
              failedCount++
            }
          } catch (e) {
            failedCount++
          }
        }))
      }

      // 4. Tell the backend to save the successful URLs to the database
      toast(`Saving ${successfulUploads.length} images to database...`, 'info')
      const commitRes = await fetch(`${API_BASE}/api/admin/products/images`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'COMMIT', updates: successfulUploads }),
      })

      const commitData = await commitRes.json()
      if (!commitRes.ok) throw new Error(commitData.error || 'Database update failed')

      // 5. Build final result object to match your existing UI state
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
    try {
      await updateProduct(p.id, { is_active: !p.is_active })
      setProducts(ps => ps.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
      toast('Status updated', 'success')
    } catch (e: any) { toast(e?.message || 'Failed', 'error') }
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
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="flt-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="ms-auto" style={{ display:'flex', gap:8 }}>
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
              <tr><th>Image</th><th>Code</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading
                ? <SkeletonRows cols={9} />
                : products.length === 0
                ? <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--ink-5)' }}>No products found</td></tr>
                : products.map(p => (
                  <tr key={p.id} style={{ background: p.stock === 0 ? 'rgba(254,240,240,.4)' : undefined }}>
                    <td>
                      <div className="prod-thumb" style={{ background: p.stock === 0 ? '#FEF0F0' : 'var(--cream-2)', overflow:'hidden' }}>
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:6 }} />
                          : (PROD_EMOJIS[p.category] || PROD_EMOJIS.default)}
                      </div>
                    </td>
                    <td><span style={{ fontFamily:'monospace', fontSize:11, color:'var(--ink-5)', background:'var(--cream-2)', padding:'2px 6px', borderRadius:4 }}>{p.product_code}</span></td>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td><span className="badge badge-USER">{p.category}</span></td>
                    <td style={{ fontSize:12, color:'var(--ink-4)' }}>{p.brand || '—'}</td>
                    <td style={{ fontWeight:700 }}>₹{p.base_price.toLocaleString('en-IN')}</td>
                    <td><StockBadge stock={p.stock} /></td>
                    <td><Toggle checked={p.is_active} onChange={() => toggleActive(p)} /></td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn btn-sm" onClick={() => openEdit(p)}>✏️ Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteItem(p)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
          <div className="fgroup"><label className="flabel">Product Code (auto)</label><input className="finput" value={editItem?.product_code || 'TFM-AUTO'} disabled /></div>
          <div className="fgroup"><label className="flabel">Name *</label><input className="finput" placeholder="e.g. Silk Blend Saree" value={form.name} onChange={e => fset('name',e.target.value)} />{formErrors.name && <div className="ferror">{formErrors.name}</div>}</div>
          <div className="fgroup"><label className="flabel">Category *</label><select value={form.category} onChange={e => fset('category',e.target.value)}><option value="">Select category</option>{CATS.map(c => <option key={c}>{c}</option>)}</select>{formErrors.category && <div className="ferror">{formErrors.category}</div>}</div>
          <div className="fgroup"><label className="flabel">Subcategory</label><input className="finput" placeholder="e.g. Silk Sarees" value={form.subcategory} onChange={e => fset('subcategory',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Brand</label><input className="finput" placeholder="Brand name" value={form.brand} onChange={e => fset('brand',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Base Price (₹) *</label><input className="finput" type="number" placeholder="999" value={form.price} onChange={e => fset('price',e.target.value)} />{formErrors.price && <div className="ferror">{formErrors.price}</div>}</div>
          <div className="fgroup"><label className="flabel">Stock Qty</label><input className="finput" type="number" placeholder="0" value={form.stock} onChange={e => fset('stock',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Color</label><input className="finput" placeholder="Red, Blue, Multi…" value={form.color} onChange={e => fset('color',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Size</label><input className="finput" placeholder="S, M, L, XL, Free Size" value={form.size} onChange={e => fset('size',e.target.value)} /></div>
          <div className="fgroup"><label className="flabel">Barcode</label><input className="finput" placeholder="Scan or enter barcode" value={form.barcode} onChange={e => fset('barcode',e.target.value)} /></div>
          <div className="fgroup full" style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <label className="flabel" style={{ margin:0 }}>Active</label>
            <Toggle checked={form.is_active} onChange={v => fset('is_active',v)} />
            <span style={{ fontSize:12, color:'var(--ink-5)' }}>Product visible on storefront</span>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Delete Product" message={`Delete &quot;${deleteItem?.name}&quot;? This will remove it from the storefront immediately.`}
        icon="🗑️" confirmLabel="Yes, Delete" />



      {/* Excel Upload Modal */}
      <Modal open={excelOpen} onClose={() => setExcelOpen(false)} title="Excel / CSV Upload" wide
        footer={<button className="btn" onClick={() => setExcelOpen(false)}>Close</button>}>
        <UploadZone label="Drag & drop your file here" subLabel="Accepts .xlsx · .xls · .csv" onFile={handleExcelFile} />
        {excelResult && (
          <div style={{ marginTop:16 }}>
            <div className="excel-result-grid">
              <div className="excel-result-box" style={{ background:'#DCFCE7' }}><div className="excel-result-val" style={{ color:'#14532D' }}>{excelResult.created ?? 0}</div><div className="excel-result-lbl">✓ Created</div></div>
              <div className="excel-result-box" style={{ background:'#DBEAFE' }}><div className="excel-result-val" style={{ color:'#1E3A8A' }}>{excelResult.updated ?? 0}</div><div className="excel-result-lbl">↻ Updated</div></div>
              <div className="excel-result-box" style={{ background:'#FEE2E2' }}><div className="excel-result-val" style={{ color:'#7F1D1D' }}>{excelResult.failed ?? 0}</div><div className="excel-result-lbl">✕ Failed</div></div>
              <div className="excel-result-box" style={{ background:'#FFF7ED' }}><div className="excel-result-val" style={{ color:'#7C2D12' }}>{excelResult.parseErrors ?? 0}</div><div className="excel-result-lbl">⚠ Parse Errors</div></div>
            </div>
          </div>
        )}
      </Modal>

      {/* ZIP Images Modal */}
      <Modal open={zipOpen} onClose={() => setZipOpen(false)} title="Upload Product Images (ZIP)" wide
        footer={<button className="btn" onClick={() => setZipOpen(false)}>Close</button>}>

        <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--cream-2)', borderRadius:8, fontSize:12.5, color:'var(--ink-3)', lineHeight:1.7 }}>
          <strong>How it works:</strong><br />
          1. Create a ZIP containing your product images<br />
          2. Name each image after its <strong>Product Code</strong> — e.g. <code style={{ background:'#fff', padding:'1px 5px', borderRadius:3 }}>TFM-001.jpg</code><br />
          3. Upload the ZIP — images are matched, uploaded to cloud storage, and saved automatically
        </div>

        {zipLoading ? (
          <div style={{ textAlign:'center', padding:'30px 0', color:'var(--ink-5)', fontSize:13 }}>
            ⏳ Uploading and processing images…
          </div>
        ) : (
          <UploadZone
            label="Drag & drop your ZIP file here"
            subLabel="ZIP containing JPG, PNG, or WebP images named by product code"
            onFile={handleZipUpload}
          />
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
    </>
  )
}