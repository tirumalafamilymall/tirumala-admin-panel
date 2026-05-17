import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut, User } from 'firebase/auth'
import { API_BASE } from './api' // We will export this from api.ts
import { onAuthStateChanged } from 'firebase/auth'

// 1. Initialize Firebase (Uses your frontend .env.local keys)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const auth = getAuth(app)

// 2. Admin Login Function
export async function loginAdmin(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const token = await cred.user.getIdToken()

  // Verify on backend — this sets the custom claim in the database/Firebase
  const res = await fetch(`${API_BASE}/api/auth/verify-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    await signOut(auth)
    throw new Error('ACCESS_DENIED')
  }

  // 🔥 The Claude Fix: Wait 1 second for Firebase servers to sync the new custom claim
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Force refresh the token AFTER the delay so proxy.ts sees the ADMIN role
  const freshToken = await cred.user.getIdToken(true)
  
  localStorage.setItem('adminToken', freshToken)
  return freshToken
}

// 3. Admin Logout Function
export async function logoutAdmin() {
  localStorage.removeItem('adminToken')
  await signOut(auth)
}

// Helper to get the token for API calls
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('adminToken')
}



export async function refreshAdminToken(): Promise<string | null> {
  // 🔥 Wait for Firebase to securely resolve the auth state
  const user = await new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      unsubscribe()
      resolve(u)
    })
  })

  if (!user) return null
  const token = await user.getIdToken(true)
  localStorage.setItem('adminToken', token)
  return token
}