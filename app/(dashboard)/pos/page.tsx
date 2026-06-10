'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { scanBarcode } from '@/lib/api'

// Define the shape of our receipt log
type ScannedItem = {
  id: string
  time: string
  name: string
  price: number
  color: string | null
  size: string | null
  new_stock: number
  warning: string | null
  status: 'SUCCESS' | 'ERROR'
  raw_barcode: string
}

export default function POSScannerPage() {
  const [barcode, setBarcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<ScannedItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // ─── THE DICTATOR: Relentlessly force focus back to the input box ───
  useEffect(() => {
    const enforceFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
      }
    }
    // Check every 500ms and whenever the user clicks anywhere on the screen
    const interval = setInterval(enforceFocus, 500)
    document.addEventListener('click', enforceFocus)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('click', enforceFocus)
    }
  }, [])

  // ─── THE SYNTHESIZER: Native browser sounds for physical feedback ───
  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      if (type === 'success') {
        // A pleasant, high-pitched retail "Ping!"
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
      } else {
        // A harsh, low "Buzz!" for errors
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, ctx.currentTime)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch (e) { console.error('Audio failed', e) }
  }

// ─── THE SCAN HANDLER ───
  const handleScan = async (e: FormEvent) => {
    e.preventDefault()
    
    const cleanBarcode = barcode.trim()
    if (!cleanBarcode || loading) return

    setLoading(true)
    setBarcode('') // Instantly clear the input so the next scan doesn't overlap

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    try {
      const res = await scanBarcode(cleanBarcode)
      
      playSound(res.item.warning ? 'error' : 'success')
      
      setLog(prev => [{
        id: Math.random().toString(),
        time: timestamp,
        name: res.item.name,
        price: res.item.price,
        color: res.item.color,
        size: res.item.size,
        new_stock: res.item.new_stock,
        warning: res.item.warning,
        status: 'SUCCESS' as const, // 🔥 FIX: Added 'as const' here
        raw_barcode: cleanBarcode
      }, ...prev].slice(0, 50)) // Keep only the last 50 items

    } catch (error: any) {
      playSound('error')
      setLog(prev => [{
        id: Math.random().toString(),
        time: timestamp,
        name: error.message || 'Unknown Barcode',
        price: 0,
        color: null,
        size: null,
        new_stock: 0,
        warning: 'Scan Failed or Item Not Found',
        status: 'ERROR' as const, // 🔥 FIX: Added 'as const' here
        raw_barcode: cleanBarcode
      }, ...prev].slice(0, 50))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 10) 
    }
  }
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px 0' }}>Store POS Synchronization</h1>
        <p style={{ color: '#6B7280', margin: 0 }}>
          Ensure your cursor is in the box below. Scan items to instantly deduct from online stock.
        </p>
      </div>

      {/* THE INPUT BOX */}
      <form onSubmit={handleScan} style={{ marginBottom: '40px' }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={loading}
            placeholder={loading ? "Processing..." : "Scan barcode here..."}
            autoFocus
            style={{
              width: '100%',
              padding: '24px',
              fontSize: '24px',
              textAlign: 'center',
              borderRadius: '12px',
              border: '3px solid #CC0000',
              boxShadow: '0 10px 25px rgba(204,0,0,0.1)',
              background: loading ? '#F3F4F6' : '#FFFFFF',
              color: '#111827',
              outline: 'none',
              letterSpacing: '0.1em'
            }}
          />
          {/* Pulsing indicator to show it's active */}
          {!loading && (
            <div style={{
              position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)',
              width: '12px', height: '12px', borderRadius: '50%', background: '#10B981',
              boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)'
            }} />
          )}
        </div>
      </form>

      {/* THE RECEIPT LOG */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ background: '#F9FAFB', padding: '16px 20px', borderBottom: '1px solid #E5E7EB', fontWeight: 600 }}>
          Recent Scans (Session Log)
        </div>
        
        {log.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
            No items scanned yet. Waiting for input...
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {log.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '16px 20px', 
                  borderBottom: '1px solid #F3F4F6',
                  background: item.status === 'ERROR' ? '#FEF2F2' : item.warning ? '#FFFBEB' : '#FFFFFF'
                }}
              >
                <div style={{ width: '80px', color: '#6B7280', fontSize: '13px' }}>
                  {item.time}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: item.status === 'ERROR' ? '#DC2626' : '#111827' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                    {item.status === 'SUCCESS' && (
                      <>
                        {item.size && <span style={{ marginRight: '12px' }}>Size: <strong>{item.size}</strong></span>}
                        {item.color && <span style={{ marginRight: '12px' }}>Color: <strong>{item.color}</strong></span>}
                        <span>Price: ₹{item.price}</span>
                      </>
                    )}
                    {item.status === 'ERROR' && <span>Barcode: {item.raw_barcode}</span>}
                  </div>
                  
                  {item.warning && (
                    <div style={{ fontSize: '12px', color: '#D97706', marginTop: '6px', fontWeight: 600 }}>
                      ⚠️ {item.warning}
                    </div>
                  )}
                </div>

                {item.status === 'SUCCESS' && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Stock Left
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: item.new_stock <= 0 ? '#DC2626' : '#10B981' }}>
                      {item.new_stock}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}