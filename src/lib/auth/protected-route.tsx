'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return
    
    // Allow access if user exists OR if in demo mode
    if (!user && !isDemo) {
      router.push('/auth/signin')
    }
  }, [user, loading, isDemo, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  // Allow access if user exists OR if in demo mode
  if (!user && !isDemo) {
    return null
  }

  return <>{children}</>
}