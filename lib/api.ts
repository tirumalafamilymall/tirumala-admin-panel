// ================== DASHBOARD ==================
export const getDashboard = async () => ({
  stats: {
    products: 1240,
    orders: 340,
    revenue: "₹2.8L",
    customers: 890,
  },
  orders: [],
})

type LinkedProduct = {
  id: string
  name: string
  price: number
}

type InstaPost = {
  id: string
  title: string
  instagramUrl: string
  is_active: boolean
  products: LinkedProduct[]
}

// ================== PRODUCTS ==================
export const getProducts = async () => []
export const createProduct = async (data?: any) => ({ success: true })
export const updateProduct = async (id?: string, data?: any) => ({ success: true })
export const deleteProduct = async (id?: string) => ({ success: true })
export const bulkUploadJSON = async (data?: any) => ({ success: true })
export const uploadExcel = async (file?: any) => ({ success: true })

// ================== ORDERS ==================
export const getOrders = async () => []
export const getOrder = async (id?: string) => ({})

export const updateOrderStatus = async (
  id: string,
  data: { status: string; trackingUrl?: string }
) => {
  console.log("Updating order:", id, data)
  return { success: true }
}

export const createShipment = async (data: { orderId: string }) => {
  console.log("Create shipment:", data)
  return { success: true }
}

export const generateAWB = async (data: { shiprocketOrderId: string }) => {
  console.log("Generate AWB:", data)
  return { success: true }
}

export const getLabel = async (data: { awb: string }) => {
  console.log("Get label:", data)
  return { success: true }
}

export const cancelShipment = async (data: { awb: string }) => {
  console.log("Cancel shipment:", data)
  return { success: true }
}

// ================== USERS ==================
export const getUsers = async () => []
export const getUser = async (id?: string) => ({})
export const changeUserRole = async (id?: string, role?: string) => ({ success: true })

// ================== INSTA LIVE ==================

let MOCK_DB: InstaPost[] = [
  {
    id: 'il1',
    title: 'Sample Live',
    instagramUrl: 'https://instagram.com',
    is_active: true,
    products: [],
  },
]

export const getInstaLivePosts = async () => {
  return MOCK_DB
}

export const createInstaPost = async (form: any) => {
  const newPost = {
    id: `il${Date.now()}`,
    ...form,
    products: [],
  }
  MOCK_DB.push(newPost)
  return { success: true, post: newPost }
}

export const updateInstaPost = async (id: string, form: any) => {
  MOCK_DB = MOCK_DB.map(p =>
    p.id === id ? { ...p, ...form } : p
  )
  return { success: true }
}

export const deleteInstaPost = async (id: string) => {
  MOCK_DB = MOCK_DB.filter(p => p.id !== id)
  return { success: true }
}

// ================== LINK PRODUCTS ==================

export const linkProduct = async (postId: string, productId: string) => {
  const post = MOCK_DB.find(p => p.id === postId)
  if (!post) return { success: false }

  if (!post.products.find(p => p.id === productId)) {
    post.products.push({
      id: productId,
      name: `Product ${productId}`,
      price: 999,
    })
  }

  return { success: true }
}

export const unlinkProduct = async (postId: string, productId: string) => {
  const post = MOCK_DB.find(p => p.id === postId)
  if (!post) return { success: false }

  post.products = post.products.filter(p => p.id !== productId)
  return { success: true }
}

// ================== SEARCH ==================

export const searchProducts = async (query: string) => {
  const MOCK_PRODUCTS = [
    { id: '1', name: 'Silk Saree', price: 1299 },
    { id: '2', name: 'Kurti Set', price: 699 },
    { id: '3', name: 'Anarkali', price: 999 },
  ]

  const filtered = MOCK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return { products: filtered }
}

// ================== UPLOAD ==================
export const uploadPresign = async () => "https://dummy-url.com/image.jpg"