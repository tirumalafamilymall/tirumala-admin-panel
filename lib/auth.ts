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
export async function loginAdmin(email: string, password: string): Promise<User> {
  // Sign in via Firebase
  const cred = await signInWithEmailAndPassword(auth, email, password)
  let token = await cred.user.getIdToken()

  // Verify on your Node.js Backend
  const res = await fetch(`${API_BASE}/api/auth/verify-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    await signOut(auth)
    throw new Error('ACCESS_DENIED')
  }

  // 🔥 FIX: Force refresh the token NOW to pull the new 'ADMIN' custom claim from Firebase
  token = await cred.user.getIdToken(true)

  // Save the fresh claim-backed token for subsequent proxy API calls
  localStorage.setItem('adminToken', token)
  return cred.user
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