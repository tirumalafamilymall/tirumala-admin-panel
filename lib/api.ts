import { getAdminToken } from './auth'

const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// This regex ensures there is exactly ONE slash between the base and the path
export const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

/* ================== CORE FETCH WRAPPER ================== */

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken()
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers })

// Auto-refresh on 401
  if (res.status === 401) {
    const { refreshAdminToken, logoutAdmin } = await import('./auth')
    const newToken = await refreshAdminToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    } else {
      // IF REFRESH FAILS: Force logout and kick to login screen
      await logoutAdmin()
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(err.message || err.error || `HTTP ${res.status}`)
  }
  
  return res.json()
}

/* ================== DASHBOARD ================== */

export const getDashboard = () => adminFetch('/api/admin/dashboard')

/* ================== PRODUCTS ================== */
export const getCategories = () => adminFetch('/api/admin/categories')

export const getProducts = (params?: Record<string, any>) => {
  const q = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') q.set(key, String(val))
    })
  }
  return adminFetch(`/api/admin/products?${q}`)
}

export const createProduct = (data: any) => 
  adminFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(data) })

export const updateProduct = (id: string, data: any) => 
  adminFetch(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteProduct = (id: string) => 
  adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' })

export const uploadExcel = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return adminFetch('/api/admin/products/excel', { method: 'POST', body: form })
}

export const searchProducts = (query: string) => 
  adminFetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=10`)

/* ================== ORDERS & SHIPPING ================== */

export const getOrders = (params?: Record<string, any>) => {
  const q = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)))
  }
  return adminFetch(`/api/admin/orders?${q}`)
}

export const getOrder = (id: string) => adminFetch(`/api/admin/orders/${id}`)

export const updateOrderStatus = (id: string, data: { status?: string; tracking_url?: string }) => 
  adminFetch(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const createShipment = (orderId: string) => 
  adminFetch('/api/shipping/create', { method: 'POST', body: JSON.stringify({ order_id: orderId }) })

export const generateAWB = (orderId: string, shipmentId: string) => 
  adminFetch('/api/admin/shipping/awb', { method: 'POST', body: JSON.stringify({ order_id: orderId, shipment_id: shipmentId }) })

export const getLabel = (shipmentId: string) => 
  adminFetch('/api/admin/shipping/label', { method: 'POST', body:JSON.stringify({ shipment_id: shipmentId }) })

export const getShippingQueue = () => adminFetch('/api/admin/shipping')

/* ================== USERS ================== */

export const getUsers = (params?: { page?: number; search?: string }) => {
  const q = new URLSearchParams()
  if (params?.page) q.set('page', String(params.page))
  if (params?.search) q.set('search', params.search)
  return adminFetch(`/api/admin/users?${q}`)
}

export const getUser = (id: string) => adminFetch(`/api/admin/users/${id}`)

export const changeUserRole = (id: string, role: string) => 
  adminFetch(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })

/* ================== INSTA LIVE ================== */

export const getInstaLivePosts = () => adminFetch('/api/admin/insta-live')

export const createInstaPost = (data: any) => 
  adminFetch('/api/admin/insta-live', { method: 'POST', body: JSON.stringify(data) })

export const updateInstaPost = (id: string, data: any) => 
  adminFetch(`/api/admin/insta-live/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteInstaPost = (id: string) => 
  adminFetch(`/api/admin/insta-live/${id}`, { method: 'DELETE' })

/* ================== INSTA LIVE ================== */

// ... other insta live functions ...

export const linkProduct = (postId: string, productId: string) => 
  adminFetch(`/api/admin/insta-live/${postId}/products`, { method: 'POST', body: JSON.stringify({ product_id: productId }) })

export const unlinkProduct = (postId: string, productId: string) => 
  adminFetch(`/api/admin/insta-live/${postId}/products/${productId}`, { method: 'DELETE' })
/* ================== UPLOADS ================== */

export const uploadPresign = (filename: string, contentType: string) => 
  adminFetch(`/api/upload/presign?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(contentType)}`)

