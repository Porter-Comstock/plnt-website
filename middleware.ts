// middleware.ts (create this in your root directory)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protected routes
  const protectedPaths = [
    '/dashboard/upload-images',
    '/dashboard/annotate',
    '/dashboard/verify'
  ]
  
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )
  
  if (isProtectedPath) {
    // Not logged in at all
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
    
    // Check if user is admin (you)
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