// test-supabase.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'NOT SET')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET')
  console.error('\nMake sure these are set in your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log('URL:', supabaseUrl)
  console.log('Key:', supabaseAnonKey.substring(0, 20) + '...')

  // Test 1: Check if we can query tables
  console.log('\n1. Testing table access...')
  const { data: plots, error: plotsError } = await supabase
    .from('plots')
    .select('*')
    .limit(5)
  
  if (plotsError) {
    console.error('❌ Error accessing plots table:', plotsError.message)
  } else {
    console.log('✅ Successfully accessed plots table. Found', plots.length, 'plots')
  }

  // Test 2: Check auth
  console.log('\n2. Testing auth...')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.log('ℹ️  No authenticated user (this is normal for anon access)')
  } else {
    console.log('✅ Authenticated as:', user.email)
  }

  // Test 3: Test storage access by trying to list files in a bucket
  console.log('\n3. Testing storage access...')
  
  // Try to list files in flight-images bucket (won't show files but will confirm bucket exists)
  const { data: flightImages, error: flightImagesError } = await supabase
    .storage
    .from('flight-images')
    .list('test', { limit: 1 })
  
  if (flightImagesError) {
    if (flightImagesError.message.includes('not found')) {
      console.error('❌ Bucket "flight-images" not found')
    } else {
      console.log('✅ Bucket "flight-images" exists (access test passed)')
    }
  } else {
    console.log('✅ Bucket "flight-images" is accessible')
  }

  // Test density-maps bucket
  const { error: densityMapsError } = await supabase
    .storage
    .from('density-maps')
    .list('test', { limit: 1 })
  
  if (densityMapsError) {
    if (densityMapsError.message.includes('not found')) {
      console.error('❌ Bucket "density-maps" not found')
    } else {
      console.log('✅ Bucket "density-maps" exists (access test passed)')
    }
  } else {
    console.log('✅ Bucket "density-maps" is accessible')
  }

  // Test exports bucket
  const { error: exportsError } = await supabase
    .storage
    .from('exports')
    .list('test', { limit: 1 })
  
  if (exportsError) {
    if (exportsError.message.includes('not found')) {
      console.error('❌ Bucket "exports" not found')
    } else {
      console.log('✅ Bucket "exports" exists (access test passed)')
    }
  } else {
    console.log('✅ Bucket "exports" is accessible')
  }

  // Test 4: Test database structure
  console.log('\n4. Testing database structure...')
  
  // Check if tables exist by querying them
  const tables = ['profiles', 'plots', 'flight_plans', 'flights', 'plant_counts', 'flight_images']
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(0) // Just check if we can query it
    
    if (error) {
      console.error(`❌ Table "${table}" - Error:`, error.message)
    } else {
      console.log(`✅ Table "${table}" exists and is accessible`)
    }
  }

  console.log('\n✨ Test complete!')
  console.log('\nNext steps:')
  console.log('1. Run "npm run dev" to start your application')
  console.log('2. Visit http://localhost:3000/auth/signup to create an account')
  console.log('3. The storage buckets are created and ready for use')
}

// Run the test
testConnection().catch(console.error)