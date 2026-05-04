// ================== DASHBOARD ==================
export const getDashboard = async () => ({
  stats: {
    products: 1240,
    orders: 340,
    revenue: "₹2.8L",
    customers: 890,
  },
  orders: []
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
export const createProduct = async () => ({ success: true })
export const updateProduct = async () => ({ success: true })
export const deleteProduct = async () => ({ success: true })
export const bulkUploadJSON = async () => ({ success: true })
export const uploadExcel = async () => ({ success: true })

// ================== ORDERS ==================
export const getOrders = async () => []
export const getOrder = async () => ({})
export const updateOrderStatus = async () => ({ success: true })
export const createShipment = async () => ({ success: true })
export const generateAWB = async () => ({ success: true })
export const getLabel = async () => ({ success: true })
export const cancelShipment = async () => ({ success: true })

// ================== USERS ==================
export const getUsers = async () => []
export const getUser = async () => ({})
export const changeUserRole = async () => ({ success: true })
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