// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

// These should be in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (generate these from Supabase)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          company_name?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          company_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          company_name?: string
          updated_at?: string
        }
      }
      plots: {
        Row: {
          id: string
          user_id: string
          name: string
          plant_type?: string
          location?: any // JSON
          boundaries?: any // JSON/GeoJSON
          area_acres: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          plant_type?: string
          location?: any
          boundaries?: any
          area_acres: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          plant_type?: string
          location?: any
          boundaries?: any
          area_acres?: number
          updated_at?: string
        }
      }
      flight_plans: {
        Row: {
          id: string
          user_id: string
          plot_id: string
          name: string
          drone_model: string
          altitude_m: number
          speed_ms: number
          overlap_percent: number
          waypoints?: any // JSON
          scheduled_for?: string
          status: 'draft' | 'scheduled' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plot_id: string
          name: string
          drone_model: string
          altitude_m: number
          speed_ms: number
          overlap_percent: number
          waypoints?: any
          scheduled_for?: string
          status?: 'draft' | 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          drone_model?: string
          altitude_m?: number
          speed_ms?: number
          overlap_percent?: number
          waypoints?: any
          scheduled_for?: string
          status?: 'draft' | 'scheduled' | 'completed' | 'cancelled'
          updated_at?: string
        }
      }
      flights: {
        Row: {
          id: string
          flight_plan_id: string
          started_at: string
          completed_at?: string
          status: 'in_progress' | 'completed' | 'failed'
          images_captured: number
          weather_conditions?: any // JSON
          created_at: string
        }
        Insert: {
          id?: string
          flight_plan_id: string
          started_at?: string
          completed_at?: string
          status?: 'in_progress' | 'completed' | 'failed'
          images_captured?: number
          weather_conditions?: any
          created_at?: string
        }
        Update: {
          completed_at?: string
          status?: 'in_progress' | 'completed' | 'failed'
          images_captured?: number
          weather_conditions?: any
        }
      }
      plant_counts: {
        Row: {
          id: string
          flight_id: string
          count: number
          confidence: number
          processing_time_s: number
          density_map_url?: string
          individual_plants?: any // JSON array
          created_at: string
        }
        Insert: {
          id?: string
          flight_id: string
          count: number
          confidence: number
          processing_time_s: number
          density_map_url?: string
          individual_plants?: any
          created_at?: string
        }
        Update: {
          count?: number
          confidence?: number
          density_map_url?: string
          individual_plants?: any
        }
      }
    }
  }
}

// Helper functions for common operations
export const dbHelpers = {
  // Get user's plots
  async getUserPlots(userId: string) {
    const { data, error } = await supabase
      .from('plots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get plot with latest flight info
  async getPlotWithFlights(plotId: string, userId: string) {
    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .select(`
        *,
        flight_plans (
          id,
          name,
          scheduled_for,
          status,
          flights (
            id,
            started_at,
            completed_at,
            status,
            images_captured,
            plant_counts (
              count,
              confidence
            )
          )
        )
      `)
      .eq('id', plotId)
      .eq('user_id', userId)
      .single()
    
    if (plotError) throw plotError
    return plot
  },

  // Create a new plot
  async createPlot(plot: Database['public']['Tables']['plots']['Insert']) {
    const { data, error } = await supabase
      .from('plots')
      .insert(plot)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Create a flight plan
  async createFlightPlan(plan: Database['public']['Tables']['flight_plans']['Insert']) {
    const { data, error } = await supabase
      .from('flight_plans')
      .insert(plan)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Upload images to storage
  async uploadImage(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('flight-images')
      .upload(path, file)
    
    if (error) throw error
    return data
  },

  // Get signed URL for private images
  async getImageUrl(path: string) {
    const { data, error } = await supabase.storage
      .from('flight-images')
      .createSignedUrl(path, 3600) // 1 hour expiry
    
    if (error) throw error
    return data.signedUrl
  },
}