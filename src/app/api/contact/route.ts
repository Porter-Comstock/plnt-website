import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with the service role key for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // You'll need to add this to your .env.local
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { first_name, last_name, email, nursery_name, nursery_size, message } = body
    
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }
    
    // Insert contact into database
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        first_name,
        last_name,
        email,
        nursery_name,
        nursery_size,
        message,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to submit contact form' },
        { status: 500 }
      )
    }
    
    // Optionally, send a notification email here using a service like SendGrid or Resend
    // await sendNotificationEmail(data)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      data 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}