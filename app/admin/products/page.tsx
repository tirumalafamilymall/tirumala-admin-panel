'use client'
import { useEffect, useState, useCallback } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct, bulkUploadJSON, uploadExcel } from '@/lib/api'
import { Modal, Confirm, Toggle, StockBadge, SkeletonRows, Pagination, UploadZone, toast } from '@/components/admin/ui'

const MOCK_PRODUCTS = [
  { id:'1', code:'TFM-001', name:'Silk Blend Saree',       category:'Sarees',    brand:'Silk Palace', price:1299, stock:0,  images:[], is_active:false },
  { id:'2', code:'TFM-002', name:'Embroidered Kurti Set',  category:'Kurtis',    brand:'Cotton King', price:699,  stock:3,  images:[], is_active:true  },
  { id:'3', code:'TFM-003', name:'Cotton Anarkali',        category:'Kurtis',    brand:'Cotton King', price:999,  stock:18, images:[], is_active:true  },
  { id:'4', code:'TFM-004', name:'Kids Lehenga Set',       category:'Kids Wear', brand:'–',           price:799,  stock:2,  images:[], is_active:true  },
  { id:'5', code:'TFM-005', name:"Men's Linen Shirt",      category:'Men Shirts',brand:'LinenCo',     price:549,  stock:0,  images:[], is_active:false },
  { id:'6', code:'TFM-006', name:'Cotton Nightie (Pink)',  category:'Nightwear', brand:'–',           price:449,  stock:22, images:[], is_active:true  },
  { id:'7', code:'TFM-007', name:'3 Piece Coord Set',      category:'Kurtis',    brand:'Cotton King', price:1049, stock:8,  images:[], is_active:true  },
  { id:'8', code:'TFM-008', name:'Girls Frock (Floral)',   category:'Kids Wear', brand:'–',           price:399,  stock:5,  images:[], is_active:true  },
]

const CATS = ['Sarees','Kurtis','Dress Materials','Nightwear','Men Shirts','Kids Wear','Accessories','Innerwear']
const PROD_EMOJIS: Record<string,string> = { Sarees:'🥻', Kurtis:'👗', 'Kids Wear':'👚', 'Men Shirts':'👕', Nightwear:'🌙', Accessories:'💍', default:'🛍️' }

const emptyForm = { name:'', category:'', subcategory:'', brand:'', price:'', stock:'', color:'', size:'', barcode:'', is_active:true }

export default function ProductsPage() {
  const [products, setProducts]   = useState(MOCK_PRODUCTS)
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]           = useState(1)
  const [addOpen, setAddOpen]     = useState(false)
  const [editItem, setEditItem]   = useState<any>(null)
  const [form, setForm]           = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string,string>>({})
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [bulkOpen, setBulkOpen]   = useState(false)
  const [bulkJSON, setBulkJSON]   = useState('')
  const [excelOpen, setExcelOpen] = useState(false)
  const [excelResult, setExcelResult] = useState<any>(null)
  const [saving, setSaving]       = useState(false)

  // Filter
  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchC = !catFilter || p.category === catFilter
    const matchS = !statusFilter || (statusFilter === 'active' ? p.is_active : !p.is_active)
    return matchQ && matchC && matchS
  })
  const PER_PAGE = 20
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  function fset(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const errs: Record<string,string> = {}
    if (!form.name.trim())     errs.name = 'Name is required'
    if (!form.category)        errs.category = 'Category is required'
    if (!form.price || isNaN(+form.price)) errs.price = 'Valid price required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const body = { ...form, price: +form.price, stock: +form.stock || 0 }
      if (editItem) {
        await updateProduct(editItem.id, body)
        setProducts(ps => ps.map(p => p.id === editItem.id ? { ...p, ...body, price: +form.price, stock: +form.stock || 0 } : p))
        toast('Product updated successfully', 'success')
      } else {
        await createProduct(body)
        toast('Product added successfully', 'success')
      }
      setAddOpen(false); setEditItem(null); setForm(emptyForm)
    } catch (e: any) { toast(e.message || 'Save failed', 'error') }
    setSaving(false)
  }

  function openEdit(p: any) {
    setForm({ name:p.name, category:p.category, subcategory:p.subcategory||'', brand:p.brand||'', price:String(p.price), stock:String(p.stock), color:p.color||'', size:p.size||'', barcode:p.barcode||'', is_active:p.is_active })
    setEditItem(p); setAddOpen(true)
  }

  async function handleDelete() {
    if (!deleteItem) return
    try { await deleteProduct(deleteItem.id); setProducts(ps => ps.filter(p => p.id !== deleteItem.id)); toast('Product deleted', 'success') }
    catch (e: any) { toast(e.message, 'error') }
  }

  async function handleBulkJSON() {
    try { JSON.parse(bulkJSON) } catch { toast('Invalid JSON', 'error'); return }
    try { await bulkUploadJSON(JSON.parse(bulkJSON)); toast('Bulk upload submitted', 'success'); setBulkOpen(false) }
    catch (e: any) { toast(e.message, 'error') }
  }

  async function handleExcelFile(file: File) {
    try {
      const result = await uploadExcel(file)
      setExcelResult(result)
      toast(`Created ${result.created}, Updated ${result.updated}`, 'success')
    } catch (e: any) { toast(e.message, 'error') }
  }

  async function toggleActive(p: any) {
    try {
      await updateProduct(p.id, { is_active: !p.is_active })
      setProducts(ps => ps.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
      toast('Status updated', 'success')
    } catch (e: any) { toast(e.message, 'error') }
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
          <button className="btn" onClick={() => setBulkOpen(true)}>📋 Bulk JSON</button>
          <button className="btn btn-gold" onClick={() => { setExcelResult(null); setExcelOpen(true) }}>📊 Excel Upload</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th><th>Code</th><th>Name</th><th>Category</th>
                <th>Brand</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <SkeletonRows cols={9} />
                : paged.length === 0
                  ? <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--ink-5)' }}>No products found</td></tr>
                  : paged.map(p => (
                    <tr key={p.id} style={{ background: p.stock === 0 ? 'rgba(254,240,240,.4)' : undefined }}>
                      <td>
                        <div className="prod-thumb" style={{ background: p.stock === 0 ? '#FEF0F0' : 'var(--cream-2)' }}>
                          {PROD_EMOJIS[p.category] || PROD_EMOJIS.default}
                        </div>
                      </td>
                      <td><span style={{ fontFamily:'monospace', fontSize:11, color:'var(--ink-5)', background:'var(--cream-2)', padding:'2px 6px', borderRadius:4 }}>{p.code}</span></td>
                      <td style={{ fontWeight:600 }}>{p.name}</td>
                      <td><span className="badge badge-USER">{p.category}</span></td>
                      <td style={{ fontSize:12, color:'var(--ink-4)' }}>{p.brand}</td>
                      <td style={{ fontWeight:700 }}>₹{p.price.toLocaleString('en-IN')}</td>
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
        <Pagination page={page} total={Math.ceil(filtered.length/PER_PAGE)} perPage={PER_PAGE} totalItems={filtered.length} onChange={setPage} />
      </div>

      {/* Add / Edit Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        title={editItem ? `Edit — ${editItem.name}` : 'Add New Product'} wide
        footer={<>
          <button className="btn" onClick={() => { setAddOpen(false); setEditItem(null) }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editItem ? 'Save Changes' : 'Add Product'}</button>
        </>}>
        <div className="form-grid">
          <div className="fgroup">
            <label className="flabel">Product Code (auto)</label>
            <input className="finput" value={editItem?.code || 'TFM-AUTO'} disabled />
          </div>
          <div className="fgroup">
            <label className="flabel">Name *</label>
            <input className="finput" placeholder="e.g. Silk Blend Saree" value={form.name} onChange={e => fset('name',e.target.value)} />
            {formErrors.name && <div className="ferror">{formErrors.name}</div>}
          </div>
          <div className="fgroup">
            <label className="flabel">Category *</label>
            <select value={form.category} onChange={e => fset('category',e.target.value)}>
              <option value="">Select category</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            {formErrors.category && <div className="ferror">{formErrors.category}</div>}
          </div>
          <div className="fgroup">
            <label className="flabel">Subcategory</label>
            <input className="finput" placeholder="e.g. Silk Sarees" value={form.subcategory} onChange={e => fset('subcategory',e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Brand</label>
            <input className="finput" placeholder="Brand name" value={form.brand} onChange={e => fset('brand',e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Base Price (₹) *</label>
            <input className="finput" type="number" placeholder="999" value={form.price} onChange={e => fset('price',e.target.value)} />
            {formErrors.price && <div className="ferror">{formErrors.price}</div>}
          </div>
          <div className="fgroup">
            <label className="flabel">Stock Qty</label>
            <input className="finput" type="number" placeholder="0" value={form.stock} onChange={e => fset('stock',e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Color</label>
            <input className="finput" placeholder="Red, Blue, Multi…" value={form.color} onChange={e => fset('color',e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Size</label>
            <input className="finput" placeholder="S, M, L, XL, Free Size" value={form.size} onChange={e => fset('size',e.target.value)} />
          </div>
          <div className="fgroup">
            <label className="flabel">Barcode</label>
            <input className="finput" placeholder="Scan or enter barcode" value={form.barcode} onChange={e => fset('barcode',e.target.value)} />
          </div>
          <div className="fgroup full">
            <label className="flabel">Product Images</label>
            <UploadZone label="Drag images or click to upload" subLabel="JPG, PNG, WebP · Max 5MB each" />
          </div>
          <div className="fgroup full" style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <label className="flabel" style={{ margin:0 }}>Active</label>
            <Toggle checked={form.is_active} onChange={v => fset('is_active',v)} />
            <span style={{ fontSize:12, color:'var(--ink-5)' }}>Product visible on storefront</span>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        title="Delete Product" message={`Delete &quot;${deleteItem?.name}&quot;?<br>This will remove it from the storefront immediately.`}
        icon="🗑️" confirmLabel="Yes, Delete" />

      {/* Bulk JSON Modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk JSON Upload" wide
        footer={<>
          <button className="btn" onClick={() => setBulkOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleBulkJSON}>Upload JSON</button>
        </>}>
        <div className="fgroup">
          <label className="flabel">Paste JSON Array</label>
          <textarea style={{ fontFamily:'monospace', fontSize:11.5, minHeight:160, background:'var(--cream-2)' }}
            placeholder={'[\n  {"name":"Silk Saree","category":"Sarees","price":1299,"stock":10},\n  {"name":"Kurti","category":"Kurtis","price":699}\n]'}
            value={bulkJSON} onChange={e => setBulkJSON(e.target.value)} />
        </div>
        <div style={{ fontSize:12, color:'var(--ink-4)', marginTop:10 }}>
          <strong style={{ color:'var(--ink-2)' }}>Required:</strong> name, price, category &nbsp;·&nbsp;
          <strong style={{ color:'var(--ink-2)' }}>Optional:</strong> brand, stock, color, size, barcode, subcategory, is_active
        </div>
      </Modal>

      {/* Excel Upload Modal */}
      <Modal open={excelOpen} onClose={() => setExcelOpen(false)} title="Excel / CSV Upload" wide
        footer={<button className="btn" onClick={() => setExcelOpen(false)}>Close</button>}>
        <UploadZone label="Drag & drop your file here" subLabel="Accepts .xlsx · .xls · .csv" onFile={handleExcelFile} />

        {excelResult && (
          <div style={{ marginTop:16 }}>
            <div className="excel-result-grid">
              <div className="excel-result-box" style={{ background:'#DCFCE7' }}>
                <div className="excel-result-val" style={{ color:'#14532D' }}>{excelResult.created}</div>
                <div className="excel-result-lbl" style={{ color:'#166534' }}>✓ Created</div>
              </div>
              <div className="excel-result-box" style={{ background:'#DBEAFE' }}>
                <div className="excel-result-val" style={{ color:'#1E3A8A' }}>{excelResult.updated}</div>
                <div className="excel-result-lbl" style={{ color:'#1D4ED8' }}>↻ Updated</div>
              </div>
              <div className="excel-result-box" style={{ background:'#FEE2E2' }}>
                <div className="excel-result-val" style={{ color:'#7F1D1D' }}>{excelResult.failed}</div>
                <div className="excel-result-lbl" style={{ color:'#991B1B' }}>✕ Failed</div>
              </div>
              <div className="excel-result-box" style={{ background:'#FFF7ED' }}>
                <div className="excel-result-val" style={{ color:'#7C2D12' }}>{excelResult.parseErrors}</div>
                <div className="excel-result-lbl" style={{ color:'#C2410C' }}>⚠ Parse Errors</div>
              </div>
            </div>
            {excelResult.failedRows?.length > 0 && (
              <div style={{ marginTop:10 }}>
                <div className="section-title">Failed Rows</div>
                <table><thead><tr><th>Row</th><th>Issue</th></tr></thead>
                <tbody>{excelResult.failedRows.map((r: any, i: number) => <tr key={i}><td>{r.row}</td><td style={{ color:'var(--red)' }}>{r.reason}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="col-map">
          <div className="col-map-title">Accepted column names</div>
          <div className="col-map-grid">
            {['Name / Product Name / Item Name','Category / Cat / Type','Price / MRP / Rate / Base Price',
              'Stock / Qty / Quantity','Code / SKU / Product Code','Brand / Company','Color / Colour','Size · Barcode']
              .map(t => <div key={t} className="col-map-item">{t}</div>)}
          </div>
        </div>
      </Modal>
    </>
  )
}
