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

const SECTION_META = [
  { num: '01', label: 'Hero Slider', sub: 'Multi-image rotating carousel deck', icon: ImageIcon, tip: 'Recommended: 1400×600px · 21:9 ratio' },
  { num: '02', label: 'Shop By Category', sub: '6-slot navigation grid', icon: LayoutTemplate, tip: '6 fixed category cards' },
  { num: '03', label: 'Discover Style', sub: 'Department cover images', icon: ImageIcon, tip: 'Women · Men · Kids' },
  { num: '04', label: 'Flash Sale Strip', sub: 'Campaign horizon banner', icon: ImageIcon, tip: 'Recommended: 1400×260px' },
  { num: '05', label: 'New Season Picks', sub: '5-slot showcase grid', icon: LayoutTemplate, tip: 'Slot 01 renders as hero tile' },
]

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
            heroSlider: data.content.heroSlider?.length > 0 ? data.content.heroSlider : DEFAULT_CONFIG.heroSlider,
            discoverStyle: { ...DEFAULT_CONFIG.discoverStyle, ...data.content.discoverStyle },
            shopByCategory: data.content.shopByCategory?.length === 6 ? data.content.shopByCategory : DEFAULT_CONFIG.shopByCategory,
            newSeason: data.content.newSeason?.length === 5 ? data.content.newSeason : DEFAULT_CONFIG.newSeason,
          })
        }
      } catch {
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '2px solid #f0e8e8', borderTop: '2px solid #9B1C1C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 600 }}>Loading configuration</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #F3F0EE',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)',
  }

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 28px',
    borderBottom: '1px solid #F8F5F3',
    background: '#FDFCFB',
  }

  const sectionBodyStyle: React.CSSProperties = {
    padding: '28px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 12,
    padding: '10px 14px',
    border: '1px solid #EDE9E6',
    borderRadius: 10,
    outline: 'none',
    background: '#FDFCFB',
    color: '#1a1a1a',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const uploadZoneStyle: React.CSSProperties = {
    border: '1.5px dashed #DDD8D4',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 6,
    background: '#FDFCFB',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        
        .sf-editor * { box-sizing: border-box; }
        
        .sf-input:focus { border-color: #9B1C1C !important; box-shadow: 0 0 0 3px rgba(155,28,28,0.06); }
        
        .upload-zone:hover { border-color: #9B1C1C !important; background: #FDF8F8 !important; }
        
        .img-card:hover .img-overlay { opacity: 1 !important; }
        
        .slot-card { transition: box-shadow 0.2s, transform 0.2s; }
        .slot-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-1px); }
        
        .pub-btn:hover:not(:disabled) { background: #7F1D1D !important; box-shadow: 0 8px 24px rgba(155,28,28,0.25) !important; transform: translateY(-1px); }
        .pub-btn:active:not(:disabled) { transform: translateY(0); }
        .pub-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .remove-btn:hover { background: #7F1D1D !important; }

        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin 0.8s linear infinite; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      <div className="sf-editor" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80, fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── STICKY HEADER ── */}
        <div style={{
          position: 'sticky', top: 12, zIndex: 50, marginBottom: 40,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
          border: '1px solid #EDE9E6',
          borderRadius: 18,
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #9B1C1C, #C53030)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(155,28,28,0.2)',
            }}>
              <LayoutTemplate size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#111', lineHeight: 1.2 }}>
                Storefront Editor
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1, letterSpacing: '0.02em' }}>
                Visual content management · Live on publish
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
              {SECTION_META.map(s => (
                <div key={s.num} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                  padding: '3px 7px', borderRadius: 6,
                  background: '#F8F5F3', color: '#9CA3AF',
                  border: '1px solid #EDE9E6',
                }}>
                  {s.num}
                </div>
              ))}
            </div>

            <button
              className="pub-btn"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px',
                background: '#9B1C1C',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(155,28,28,0.2)',
                fontFamily: 'inherit',
              }}
            >
              {saving
                ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }} className="spin" /> Publishing…</>
                : <><Save size={13} /> Publish Changes</>
              }
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── 🔥 UPGRADED SECTION 1: DYNAMIC HERO SLIDER DECK ── */}
          <div style={sectionStyle} className="fade-up slot-card">
            <div style={sectionHeaderStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#C53030', minWidth: 24 }}>01</div>
              <div style={{ width: 1, height: 28, background: '#EDE9E6' }} />
              <ImageIcon size={15} color="#9CA3AF" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', letterSpacing: '0.01em' }}>Hero Slider Carousel Deck</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Manage multiple rotating storefront banners · Recommended 1400×600px</div>
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', background: '#F8F5F3', border: '1px solid #EDE9E6', padding: '3px 10px', borderRadius: 6, letterSpacing: '0.06em', fontWeight: 600 }}>
                {config.heroSlider.filter(s => s.img).length} SLIDES
              </div>
            </div>
            
            <div style={{ ...sectionBodyStyle, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {config.heroSlider.map((slide, idx) => {
                if (!slide.img) return null;
                return (
                  <div key={idx} className="slot-card" style={{ border: '1px solid #F0EBE8', borderRadius: 14, overflow: 'hidden', background: '#FDFCFB' }}>
                    <div style={{ padding: '10px 14px', background: '#F8F5F3', borderBottom: '1px solid #EDE9E6', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#B0A8A4', textTransform: 'uppercase' }}>Slide 0{idx + 1}</span>
                    </div>
                    <div style={{ padding: 14 }}>
                      <div className="img-card" style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', background: '#F0EBE8' }}>
                        <img src={slide.img} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                        <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.25s' }}>
                          <button
                            className="remove-btn"
                            onClick={() => {
                              const updated = config.heroSlider.filter((_, i) => i !== idx);
                              setConfig({ ...config, heroSlider: updated.length > 0 ? updated : [{ img: '', href: '#' }] });
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#9B1C1C', color: '#fff', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Seamless, consistent upload card slot integration */}
              <div className="slot-card" style={{ border: '1px solid #F0EBE8', borderRadius: 14, overflow: 'hidden', background: '#FDFCFB' }}>
                <div style={{ padding: '10px 14px', background: '#F8F5F3', borderBottom: '1px solid #EDE9E6', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#B0A8A4', textTransform: 'uppercase' }}>Add New Slide</span>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="upload-zone" style={{ ...uploadZoneStyle, height: 110 }}>
                    <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleUpload(e.target.files[0], (url) => {
                            const cleanSlides = config.heroSlider.filter(s => s.img);
                            setConfig({ ...config, heroSlider: [...cleanSlides, { img: url, href: '#' }] });
                          }, `hero_new`);
                        }
                      }} 
                    />
                    {uploading === 'hero_new'
                      ? <div style={{ width: 16, height: 16, border: '2px solid #EDE9E6', borderTop: '2px solid #9B1C1C', borderRadius: '50%' }} className="spin" />
                      : <UploadCloud size={18} color="#C4B8B2" />
                    }
                    <span style={{ fontSize: 10, color: '#B0A8A4', fontWeight: 500, marginTop: 4 }}>
                      {uploading === 'hero_new' ? 'Uploading…' : 'Upload Image File'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: SHOP BY CATEGORY ── */}
          <div style={sectionStyle} className="fade-up slot-card">
            <div style={sectionHeaderStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#C53030' }}>02</div>
              <div style={{ width: 1, height: 28, background: '#EDE9E6' }} />
              <LayoutTemplate size={15} color="#9CA3AF" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Shop By Category</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>6 fixed navigation slots</div>
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', background: '#F8F5F3', border: '1px solid #EDE9E6', padding: '3px 10px', borderRadius: 6, letterSpacing: '0.06em', fontWeight: 600 }}>
                6 SLOTS
              </div>
            </div>
            <div style={{ ...sectionBodyStyle, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {config.shopByCategory.map((cat, i) => (
                <div key={i} className="slot-card" style={{ border: '1px solid #F0EBE8', borderRadius: 14, overflow: 'hidden', background: '#FDFCFB' }}>
                  <div style={{ padding: '10px 14px', background: '#F8F5F3', borderBottom: '1px solid #EDE9E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#B0A8A4', textTransform: 'uppercase' }}>Slot {String(i + 1).padStart(2, '0')}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.img && cat.name ? '#10B981' : '#DDD8D4' }} />
                  </div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cat.img ? (
                      <div className="img-card" style={{ position: 'relative', height: 100, borderRadius: 10, overflow: 'hidden', background: '#F0EBE8' }}>
                        <img src={cat.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}>
                          <button onClick={() => updateCategory(i, 'img', '')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#fff', color: '#9B1C1C', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Trash2 size={11} /> Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-zone" style={{ ...uploadZoneStyle, height: 100 }}>
                        <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateCategory(i, 'img', url), `cat_${i}`) }} />
                        {uploading === `cat_${i}` ? <div style={{ width: 16, height: 16, border: '2px solid #EDE9E6', borderTop: '2px solid #9B1C1C', borderRadius: '50%' }} className="spin" /> : <UploadCloud size={16} color="#C4B8B2" />}
                        <span style={{ fontSize: 10, color: '#B0A8A4', fontWeight: 500 }}>{uploading === `cat_${i}` ? 'Uploading…' : 'Add image'}</span>
                      </div>
                    )}
                    <input className="sf-input" style={inputStyle} placeholder="Category name" value={cat.name}
                      onChange={(e) => updateCategory(i, 'name', e.target.value)} />
                    <div style={{ position: 'relative' }}>
                      <input className="sf-input" style={{ ...inputStyle, paddingLeft: 30, fontFamily: 'monospace', fontSize: 11 }} placeholder="/collections/…" value={cat.href}
                        onChange={(e) => updateCategory(i, 'href', e.target.value)} />
                      <LinkIcon size={12} color="#C4B8B2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 3: DISCOVER STYLE ── */}
          <div style={sectionStyle} className="fade-up slot-card">
            <div style={sectionHeaderStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#C53030' }}>03</div>
              <div style={{ width: 1, height: 28, background: '#EDE9E6' }} />
              <ImageIcon size={15} color="#9CA3AF" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Discover Your Style</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Department cover images — Women · Men · Kids</div>
              </div>
            </div>
            <div style={{ ...sectionBodyStyle, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {(['women', 'men', 'kids'] as const).map((dept) => (
                <div key={dept} className="slot-card" style={{ border: '1px solid #F0EBE8', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: '#F8F5F3', borderBottom: '1px solid #EDE9E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#B0A8A4', textTransform: 'uppercase' }}>{dept}'s</span>
                    <span style={{ fontSize: 9, background: '#EDE9E6', color: '#9CA3AF', padding: '2px 7px', borderRadius: 5, fontWeight: 600, letterSpacing: '0.06em' }}>FIXED</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    {config.discoverStyle[dept] ? (
                      <div className="img-card" style={{ position: 'relative', height: 160, borderRadius: 10, overflow: 'hidden' }}>
                        <img src={config.discoverStyle[dept]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}>
                          <button onClick={() => updateDiscoverStyle(dept, '')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#fff', color: '#9B1C1C', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Trash2 size={11} /> Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-zone" style={{ ...uploadZoneStyle, height: 160 }}>
                        <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateDiscoverStyle(dept, url), `dept_${dept}`) }} />
                        {uploading === `dept_${dept}` ? <div style={{ width: 18, height: 18, border: '2px solid #EDE9E6', borderTop: '2px solid #9B1C1C', borderRadius: '50%' }} className="spin" /> : <UploadCloud size={20} color="#C4B8B2" />}
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 4 }}>
                          {uploading === `dept_${dept}` ? 'Uploading…' : `Upload ${dept} poster`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 4: FLASH SALE ── */}
          <div style={sectionStyle} className="fade-up slot-card">
            <div style={sectionHeaderStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#C53030' }}>04</div>
              <div style={{ width: 1, height: 28, background: '#EDE9E6' }} />
              <ImageIcon size={15} color="#9CA3AF" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Flash Sale Strip</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Campaign horizon banner · 1400×260px recommended</div>
              </div>
            </div>
            <div style={sectionBodyStyle}>
              {config.flashSale?.img ? (
                <div className="img-card" style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 110 }}>
                  <img src={config.flashSale.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}>
                    <button className="remove-btn" onClick={() => setConfig({ ...config, flashSale: { img: '' } })}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#9B1C1C', color: '#fff', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                      <Trash2 size={12} /> Replace Banner
                    </button>
                  </div>
                </div>
              ) : (
                <div className="upload-zone" style={{ ...uploadZoneStyle, height: 110 }}>
                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => setConfig({ ...config, flashSale: { img: url } }), 'flash') }} />
                  {uploading === 'flash' ? <div style={{ width: 18, height: 18, border: '2px solid #EDE9E6', borderTop: '2px solid #9B1C1C', borderRadius: '50%' }} className="spin" /> : <UploadCloud size={20} color="#C4B8B2" />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginTop: 4 }}>
                    {uploading === 'flash' ? 'Uploading…' : 'Drop flash sale ribbon graphic'}
                  </span>
                  <span style={{ fontSize: 10, color: '#B0A8A4' }}>1400×260px · Wide format</span>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 5: NEW SEASON PICKS ── */}
          <div style={sectionStyle} className="fade-up slot-card">
            <div style={sectionHeaderStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#C53030' }}>05</div>
              <div style={{ width: 1, height: 28, background: '#EDE9E6' }} />
              <LayoutTemplate size={15} color="#9CA3AF" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>New Season Picks</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>5-slot showcase · Slot 01 renders as double-height hero tile</div>
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', background: '#F8F5F3', border: '1px solid #EDE9E6', padding: '3px 10px', borderRadius: 6, letterSpacing: '0.06em', fontWeight: 600 }}>
                5 SLOTS
              </div>
            </div>

            {/* Info strip */}
            <div style={{ margin: '0 28px', marginTop: 20, padding: '10px 14px', background: '#FFFBF0', border: '1px solid #FDE68A', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Eye size={13} color="#D97706" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
                <strong>Slot 01</strong> compiles as a double-height feature frame on desktop. Use your highest-quality editorial image here.
              </span>
            </div>

            <div style={{ ...sectionBodyStyle, paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {config.newSeason.map((item, i) => (
                <div key={i} className="slot-card" style={{ border: '1px solid #F0EBE8', borderRadius: 14, overflow: 'hidden', background: '#FDFCFB' }}>
                  <div style={{ padding: '10px 14px', background: '#F8F5F3', borderBottom: '1px solid #EDE9E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#B0A8A4', textTransform: 'uppercase' }}>
                      Season {String(i + 1).padStart(2, '0')}
                    </span>
                    {i === 0 && (
                      <span style={{ fontSize: 9, background: '#FEF2F2', color: '#9B1C1C', border: '1px solid #FECACA', padding: '2px 8px', borderRadius: 5, fontWeight: 700, letterSpacing: '0.06em' }}>
                        HERO TILE
                      </span>
                    )}
                  </div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {item.img ? (
                      <div className="img-card" style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden' }}>
                        <img src={item.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}>
                          <button onClick={() => updateNewSeason(i, 'img', '')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#fff', color: '#9B1C1C', border: 'none', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Trash2 size={11} /> Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-zone" style={{ ...uploadZoneStyle, height: 110 }}>
                        <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], (url) => updateNewSeason(i, 'img', url), `season_${i}`) }} />
                        {uploading === `season_${i}` ? <div style={{ width: 16, height: 16, border: '2px solid #EDE9E6', borderTop: '2px solid #9B1C1C', borderRadius: '50%' }} className="spin" /> : <UploadCloud size={16} color="#C4B8B2" />}
                        <span style={{ fontSize: 10, color: '#B0A8A4', fontWeight: 500 }}>{uploading === `season_${i}` ? 'Uploading…' : 'Mount artwork'}</span>
                      </div>
                    )}
                    <input className="sf-input" style={inputStyle} placeholder="Title (e.g. Anarkali Sets)" value={item.title}
                      onChange={(e) => updateNewSeason(i, 'title', e.target.value)} />
                    <input className="sf-input" style={{ ...inputStyle, color: '#6B7280' }} placeholder="Subtext (e.g. Timeless Elegance)" value={item.desc}
                      onChange={(e) => updateNewSeason(i, 'desc', e.target.value)} />
                    <div style={{ position: 'relative' }}>
                      <input className="sf-input" style={{ ...inputStyle, paddingLeft: 30, fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }} placeholder="/collections/…" value={item.href}
                        onChange={(e) => updateNewSeason(i, 'href', e.target.value)} />
                      <LinkIcon size={12} color="#C4B8B2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}