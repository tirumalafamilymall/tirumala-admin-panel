'use client'

import { useState, useEffect } from 'react'
import { getAdminToken } from '@/lib/auth'
import { API_BASE } from '@/lib/api'
import { toast } from '@/components/admin/ui'
import { LayoutTemplate, Image as ImageIcon, Save, Loader2, UploadCloud, Link as LinkIcon, Sparkles, Trash2, Eye } from 'lucide-react'

const DEFAULT_CONFIG = {
  heroSlider: [{ img: '', href: '#' }],
  shopByCategory: Array(6).fill({ name: '', href: '', img: '' }),
  discoverStyle: { women: '', men: '', kids: '' },
  flashSale: { img: '' },
  newSeason: Array(5).fill({ title: '', desc: '', href: '', img: '' })
}

export default function StorefrontEditor() {
  const [config, setConfig] = useState<typeof DEFAULT_CONFIG>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`${API_BASE}/api/storefront`)
        const data = await res.json()
        if (data.success && data.content) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data.content,
            discoverStyle: { ...DEFAULT_CONFIG.discoverStyle, ...data.content.discoverStyle },
            shopByCategory: data.content.shopByCategory?.length === 6 ? data.content.shopByCategory : DEFAULT_CONFIG.shopByCategory,
            newSeason: data.content.newSeason?.length === 5 ? data.content.newSeason : DEFAULT_CONFIG.newSeason,
          })
        }
      } catch (err) {
        toast('Failed to load storefront configuration', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  async function handleUpload(file: File, updateStateCallback: (url: string) => void, uploadKey: string) {
    setUploading(uploadKey)
    try {
      const token = getAdminToken()
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      
      const initRes = await fetch(`${API_BASE}/api/upload/presign?filename=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}`, { headers })
      const { uploadUrl, publicUrl } = await initRes.json()
      
      if (!uploadUrl) throw new Error('Failed to get upload URL')
      
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' } })
      if (!uploadRes.ok) throw new Error('Failed to upload file to cloud')
      
      updateStateCallback(publicUrl)
      toast('Image uploaded successfully', 'success')
    } catch (e: any) {
      toast(e.message || 'Upload failed', 'error')
    } finally {
      setUploading(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/storefront`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: config })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast('Homepage updated successfully! Live on site.', 'success')
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error')
    }
    setSaving(false)
  }

  const updateCategory = (index: number, key: string, value: string) => {
    const newCats = [...config.shopByCategory]
    newCats[index] = { ...newCats[index], [key]: value }
    setConfig({ ...config, shopByCategory: newCats })
  }

  const updateDiscoverStyle = (key: 'women' | 'men' | 'kids', value: string) => {
    setConfig({ ...config, discoverStyle: { ...config.discoverStyle, [key]: value } })
  }

  const updateNewSeason = (index: number, key: string, value: string) => {
    const newSeason = [...config.newSeason]
    newSeason[index] = { ...newSeason[index], [key]: value }
    setConfig({ ...config, newSeason })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-red-600" size={36} />
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Loading Live Configurations...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4">
      
      {/* ── STICKY GLASSMORPHIC TOP CONTROL HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-red-600 to-red-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-red-600/10">
            <LayoutTemplate size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Storefront Editor</h1>
            <p className="text-xs text-gray-500 mt-0.5">Control global landing visual nodes and dynamic navigation routing links.</p>
          </div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full sm:w-auto px-6 py-3.5 bg-gray-900 hover:bg-red-600 text-white disabled:bg-gray-400 rounded-xl text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-red-600/10 active:scale-98"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Publishing Context...' : 'Publish Changes'}
        </button>
      </div>

      <div className="space-y-14">
        
        {/* ── SECTION 1: HERO SLIDER BANNER ── */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] p-6 lg:p-8">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-50">
            <ImageIcon size={18} className="text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">1. Top Hero Slider Canvas</h2>
          </div>
          
          <div className="w-full">
            {config.heroSlider[0]?.img ? (
              <div className="relative group rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-900 aspect-[21/9] sm:max-h-[300px]">
                <img src={config.heroSlider[0].img} alt="Hero Banner" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-xs">
                  <button 
                    onClick={() => setConfig({...config, heroSlider: [{ img: '', href: '#' }]})} 
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-lg transition-transform duration-200 active:scale-95"
                  >
                    <Trash2 size={13} /> Remove Artwork
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center bg-gray-50/50 hover:bg-gray-50/80 hover:border-red-300 transition-all duration-300 relative aspect-[21/9] sm:max-h-[240px] flex items-center justify-center">
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => {
                  if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => setConfig({...config, heroSlider: [{ img: url, href: '#' }]}), 'hero')
                }} />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs border text-gray-400">
                    {uploading === 'hero' ? <Loader2 size={18} className="animate-spin text-red-500" /> : <UploadCloud size={18} />}
                  </div>
                  <span className="text-xs font-semibold text-gray-600 mt-1">
                    {uploading === 'hero' ? 'Uploading to DO Cloud Spaces...' : 'Click or Drag Panoramic Landscape Banner'}
                  </span>
                  <span className="text-[10px] text-gray-400 tracking-wider">Recommended Aspect: 21:9 (1400x600px)</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION 2: SHOP BY CATEGORY (6 CARDS) ── */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] p-6 lg:p-8">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-50">
            <LayoutTemplate size={18} className="text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">2. Shop By Category Layout Grid (6 Fixed Slots)</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.shopByCategory.map((cat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden hover:border-gray-200 transition-all group">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">Category Slot 0{i + 1}</span>
                  <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-red-500 transition-colors" />
                </div>
                
                <div className="p-5 space-y-4">
                  <div>
                    {cat.img ? (
                      <div className="relative group h-32 rounded-xl overflow-hidden border border-gray-100">
                        <img src={cat.img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <button onClick={() => updateCategory(i, 'img', '')} className="p-2 bg-white text-gray-900 rounded-lg text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1 transition active:scale-95">
                            <Trash2 size={12} className="text-red-500" /> Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 border border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50/30 relative hover:bg-gray-50 transition">
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                          if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateCategory(i, 'img', url), `cat_${i}`)
                        }} />
                        {uploading === `cat_${i}` ? <Loader2 size={16} className="animate-spin text-red-500" /> : <div className="flex flex-col items-center text-gray-400 text-[11px] font-medium"><UploadCloud size={16} className="mb-1" /> Add Card image</div>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="relative">
                      <input className="w-full text-xs font-semibold p-3 pl-8 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500/20 bg-white outline-none transition" placeholder="Category Name (e.g., Ethnic Wear)" value={cat.name} onChange={(e) => updateCategory(i, 'name', e.target.value)} />
                      <Sparkles size={13} className="absolute left-3 top-3.5 text-gray-400" />
                    </div>
                    <div className="relative">
                      <input className="w-full text-xs p-3 pl-8 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500/20 bg-white outline-none transition text-gray-500 font-mono" placeholder="Routing Node (e.g., /collections/sarees)" value={cat.href} onChange={(e) => updateCategory(i, 'href', e.target.value)} />
                      <LinkIcon size={13} className="absolute left-3 top-3.5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: DISCOVER YOUR STYLE ── */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] p-6 lg:p-8">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-50">
            <ImageIcon size={18} className="text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">3. Discover Your Style Department Covers</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['women', 'men', 'kids'] as const).map((dept) => (
              <div key={dept} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden group">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-widest text-gray-600 uppercase">{dept}'s department edit</span>
                  <span className="text-[9px] bg-gray-200 font-mono px-2 py-0.5 rounded-md text-gray-500">Fixed Node</span>
                </div>
                
                <div className="p-5">
                  {config.discoverStyle[dept] ? (
                    <div className="relative group h-44 rounded-xl overflow-hidden border border-gray-100">
                      <img src={config.discoverStyle[dept]} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button onClick={() => updateDiscoverStyle(dept, '')} className="px-3 py-1.5 bg-white text-gray-900 rounded-xl text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1 transition active:scale-95">
                          <Trash2 size={12} className="text-red-500" /> Change Grid Graphics
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50/30 relative hover:bg-gray-50 transition">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                        if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateDiscoverStyle(dept, url), `dept_${dept}`)
                      }} />
                      {uploading === `dept_${dept}` ? (
                        <Loader2 size={18} className="animate-spin text-red-500" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400 text-xs font-semibold gap-1">
                          <UploadCloud size={20} />
                          <span>Upload {dept} poster</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: FLASH SALE STRIP ── */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] p-6 lg:p-8">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-50">
            <ImageIcon size={18} className="text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">4. Campaign Flash Sale Horizon Strip</h2>
          </div>
          
          <div className="w-full">
            {config.flashSale?.img ? (
              <div className="relative group rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-900 h-28">
                <img src={config.flashSale.img} alt="Flash Sale Ribbon" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <button 
                    onClick={() => setConfig({...config, flashSale: { img: '' }})} 
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-lg transition duration-200"
                  >
                    <Trash2 size={13} /> Change Promotion Ribbon
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-gray-50/80 hover:border-red-300 transition-all duration-300 relative h-28 flex items-center justify-center">
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                  if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => setConfig({...config, flashSale: { img: url }}), 'flash')
                }} />
                <div className="flex flex-col items-center gap-1">
                  {uploading === 'flash' ? <Loader2 size={18} className="animate-spin text-red-500" /> : <UploadCloud size={20} className="text-gray-400" />}
                  <span className="text-xs font-semibold text-gray-600">
                    {uploading === 'flash' ? 'Uploading Banner...' : 'Drop Wide Flash Ribbon Graphic'}
                  </span>
                  <span className="text-[10px] text-gray-400">Optimal dimension parameters: 1400x260px</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION 5: NEW SEASON PICKS ── */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] p-6 lg:p-8">
          <div className="flex items-center gap-2.5 mb-2 pb-4 border-b border-gray-50">
            <LayoutTemplate size={18} className="text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">5. New Season Picks Showcase (5 Slots)</h2>
          </div>
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] font-medium text-amber-800 leading-relaxed mb-6 flex items-start gap-2">
            <Eye size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <span><strong>Structural layout behavior:</strong> Slot 1 compiles instantly into a high-visibility, double-height feature frame on the desktop storefront grid. Make sure to use your absolute highest-quality premium product edit for Slot 1!</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.newSeason.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden hover:border-gray-200 transition group">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">Season Card 0{i + 1}</span>
                  {i === 0 && <span className="text-[9px] bg-red-50 text-red-700 border border-red-100 font-bold px-2 py-0.5 rounded-md tracking-wider uppercase">Hero Tile</span>}
                </div>
                
                <div className="p-5 space-y-4">
                  <div>
                    {item.img ? (
                      <div className="relative group h-28 rounded-xl overflow-hidden border">
                        <img src={item.img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <button onClick={() => updateNewSeason(i, 'img', '')} className="p-2 bg-white text-gray-900 rounded-lg text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1 transition">
                            <Trash2 size={12} className="text-red-500" /> Clear File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 border border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50/30 relative hover:bg-gray-100 transition">
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                          if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateNewSeason(i, 'img', url), `season_${i}`)
                        }} />
                        {uploading === `season_${i}` ? <Loader2 size={16} className="animate-spin text-red-500" /> : <div className="flex flex-col items-center text-gray-400 text-[11px] font-medium"><UploadCloud size={16} className="mb-1" /> Mount Card Artwork</div>}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input className="w-full text-xs font-semibold p-2.5 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500/20 bg-white outline-none transition" placeholder="Main Title (e.g., Anarkali Sets)" value={item.title} onChange={(e) => updateNewSeason(i, 'title', e.target.value)} />
                    <input className="w-full text-xs p-2.5 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500/20 bg-white outline-none transition text-gray-500" placeholder="Subtext Description (e.g., Timeless Elegance)" value={item.desc} onChange={(e) => updateNewSeason(i, 'desc', e.target.value)} />
                    <div className="relative">
                      <input className="w-full text-xs p-2.5 pl-8 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500/20 bg-white outline-none transition font-mono text-gray-500" placeholder="Target Route Link" value={item.href} onChange={(e) => updateNewSeason(i, 'href', e.target.value)} />
                      <LinkIcon size={12} className="absolute left-2.5 top-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}