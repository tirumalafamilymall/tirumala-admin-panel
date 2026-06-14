'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminToken } from '@/lib/auth'

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace(getAdminToken() ? '/dashboard' : '/login')
  }, [])
  return null
}