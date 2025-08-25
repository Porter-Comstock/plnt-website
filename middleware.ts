// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Debug log
  console.log('Middleware check - path:', req.nextUrl.pathname, 'demo param:', req.nextUrl.searchParams.get('demo'))
  
  // Check for demo mode FIRST, before any auth checks
  const isDemoMode = req.nextUrl.searchParams.get('demo') === 'true' || 
                     req.cookies.get('isDemoMode')?.value === 'true'
  
  // If in demo mode, allow access to dashboard (but not admin routes)
  if (isDemoMode) {
    console.log('Demo mode detected in middleware - allowing access')
    // Still protect admin-only routes even in demo mode
    const adminOnlyPaths = [
      '/dashboard/upload-images',
      '/dashboard/annotate',
      '/dashboard/verify',
      '/dashboard/admin'
    ]
    
    const isAdminPath = adminOnlyPaths.some(path => 
      req.nextUrl.pathname.startsWith(path)
    )
    
    if (isAdminPath) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    return res // Allow demo access to regular dashboard
  }
  
  // For non-demo users, check authentication
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  
  // If no session and trying to access dashboard (and not in demo mode)
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }
  
  // Admin-only paths protection for logged-in users
  const adminOnlyPaths = [
    '/dashboard/upload-images',
    '/dashboard/annotate', 
    '/dashboard/verify',
    '/dashboard/admin'
  ]
  
  const isAdminPath = adminOnlyPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )
  
  if (isAdminPath && session) {
    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      // Not admin - redirect to dashboard home
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }
  
  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}