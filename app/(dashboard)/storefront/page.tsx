'use client'

import { useState, useEffect } from 'react'
import { getAdminToken } from '@/lib/auth'
import { API_BASE } from '@/lib/api'
import { toast } from '@/components/admin/ui'
import { LayoutTemplate, Image as ImageIcon, Save, Loader2, UploadCloud } from 'lucide-react'

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

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div>

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <LayoutTemplate size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Homepage Editor</h1>
            <p className="text-sm text-gray-500">Update banners and collections across your landing layout instantly.</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Publishing...' : 'Publish Changes'}
        </button>
      </div>

      <div className="space-y-8">
        {/* 1. Main Hero Slider */}
        <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6 border-b pb-4 flex items-center gap-2"><ImageIcon size={18} className="text-gray-400"/> 1. Top Hero Slider Banner</h2>
          <div className="fgroup full">
            {config.heroSlider[0]?.img ? (
              <div className="relative group rounded-xl overflow-hidden border border-gray-200">
                <img src={config.heroSlider[0].img} alt="Hero Banner" className="w-full h-44 object-cover" />
                <button onClick={() => setConfig({...config, heroSlider: [{ img: '', href: '#' }]})} className="absolute inset-0 bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition">Remove Image</button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition relative">
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                  if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => setConfig({...config, heroSlider: [{ img: url, href: '#' }]}), 'hero')
                }} />
                {uploading === 'hero' ? <span className="text-sm text-gray-500">Uploading to Cloud...</span> : <span className="text-sm font-medium text-gray-600 flex items-center justify-center gap-2"><UploadCloud size={18}/> Click to Upload Hero Banner</span>}
              </div>
            )}
          </div>
        </section>

        {/* 2. Shop By Category (6 slots) */}
        <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6 border-b pb-4 flex items-center gap-2"><LayoutTemplate size={18} className="text-gray-400"/> 2. Shop By Category (6 Slots)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.shopByCategory.map((cat, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Slot {i + 1} Graphic</label>
                <div className="mb-3">
                  {cat.img ? (
                    <div className="relative group h-24 rounded-lg overflow-hidden border">
                      <img src={cat.img} className="w-full h-full object-cover" />
                      <button onClick={() => updateCategory(i, 'img', '')} className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition">Change</button>
                    </div>
                  ) : (
                    <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative cursor-pointer hover:bg-gray-100 transition">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                        if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateCategory(i, 'img', url), `cat_${i}`)
                      }} />
                      {uploading === `cat_${i}` ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <UploadCloud size={18} className="text-gray-400" />}
                    </div>
                  )}
                </div>
                <input className="w-full text-sm p-2 border rounded-md mb-2 focus:ring-1 focus:ring-red-500 outline-none" placeholder="Category Title" value={cat.name} onChange={(e) => updateCategory(i, 'name', e.target.value)} />
                <input className="w-full text-sm p-2 border rounded-md focus:ring-1 focus:ring-red-500 outline-none" placeholder="Route (e.g., /collections/sarees)" value={cat.href} onChange={(e) => updateCategory(i, 'href', e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        {/* 3. Discover Your Style */}
        <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6 border-b pb-4 flex items-center gap-2"><ImageIcon size={18} className="text-gray-400"/> 3. Discover Your Style Blocks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['women', 'men', 'kids'] as const).map((dept) => (
              <div key={dept} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{dept}'s Edit Cover</label>
                {config.discoverStyle[dept] ? (
                  <div className="relative group h-36 rounded-lg overflow-hidden border">
                    <img src={config.discoverStyle[dept]} className="w-full h-full object-cover" />
                    <button onClick={() => updateDiscoverStyle(dept, '')} className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition">Change Graphic</button>
                  </div>
                ) : (
                  <div className="h-36 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative cursor-pointer hover:bg-gray-100 transition">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                      if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateDiscoverStyle(dept, url), `dept_${dept}`)
                    }} />
                    {uploading === `dept_${dept}` ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <UploadCloud size={18} className="text-gray-400" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 4. Flash Sale */}
        <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6 border-b pb-4 flex items-center gap-2"><ImageIcon size={18} className="text-gray-400"/> 4. Flash Sale Ribbon</h2>
          <div className="fgroup full">
            {config.flashSale?.img ? (
              <div className="relative group rounded-xl overflow-hidden border border-gray-200">
                <img src={config.flashSale.img} alt="Flash Sale Ribbon" className="w-full h-28 object-cover" />
                <button onClick={() => setConfig({...config, flashSale: { img: '' }})} className="absolute inset-0 bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition">Remove Strip</button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition relative">
                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                  if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => setConfig({...config, flashSale: { img: url }}), 'flash')
                }} />
                {uploading === 'flash' ? <span className="text-sm text-gray-500">Uploading Strip...</span> : <span className="text-sm font-medium text-gray-600 flex items-center justify-center gap-2"><UploadCloud size={18}/> Upload Wide Flash Strip</span>}
              </div>
            )}
          </div>
        </section>

        {/* 5. New Season Picks (5 slots) */}
        <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6 border-b pb-4 flex items-center gap-2"><LayoutTemplate size={18} className="text-gray-400"/> 5. New Season Picks (5 Slots)</h2>
          <p className="text-xs text-amber-600 font-semibold mb-4">💡 Layout Info: Slot 1 automatically acts as the double-height feature card on the desktop storefront grid.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.newSeason.map((item, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Card Slot {i + 1}</label>
                <div className="mb-3">
                  {item.img ? (
                    <div className="relative group h-24 rounded-lg overflow-hidden border">
                      <img src={item.img} className="w-full h-full object-cover" />
                      <button onClick={() => updateNewSeason(i, 'img', '')} className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition">Change Image</button>
                    </div>
                  ) : (
                    <div className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative cursor-pointer hover:bg-gray-100 transition">
                      <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                        if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateNewSeason(i, 'img', url), `season_${i}`)
                      }} />
                      {uploading === `season_${i}` ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <UploadCloud size={18} className="text-gray-400" />}
                    </div>
                  )}
                </div>
                <input className="w-full text-sm p-2 border rounded-md mb-2 focus:ring-1 focus:ring-red-500 outline-none" placeholder="Card Main Title" value={item.title} onChange={(e) => updateNewSeason(i, 'title', e.target.value)} />
                <input className="w-full text-sm p-2 border rounded-md mb-2 focus:ring-1 focus:ring-red-500 outline-none" placeholder="Sub-label Text" value={item.desc} onChange={(e) => updateNewSeason(i, 'desc', e.target.value)} />
                <input className="w-full text-sm p-2 border rounded-md focus:ring-1 focus:ring-red-500 outline-none" placeholder="Link Destination" value={item.href} onChange={(e) => updateNewSeason(i, 'href', e.target.value)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}