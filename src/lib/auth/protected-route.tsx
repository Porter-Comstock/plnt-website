// lib/auth/protected-route.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !isDemo) {
      router.push('/auth/signin')
    }
  }, [user, loading, isDemo, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  if (!user && !isDemo) {
    return null
  }

  return <>{children}</>
}