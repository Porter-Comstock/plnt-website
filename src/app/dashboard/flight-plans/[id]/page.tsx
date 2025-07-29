// app/dashboard/flight-plans/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/lib/auth/protected-route'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  ArrowLeft,
  Download,
  Plane,
  MapPin,
  Calendar,
  Clock,
  Settings,
  FileDown,
} from 'lucide-react'
import FlightPathPreviewMap from '@/components/flight-path-preview-map'

// Using Plane icon as Drone
const Drone = Plane

interface FlightPlan {
  id: string
  name: string
  plot_id: string
  plot?: {
    name: string
    area_acres: number
  }
  drone_model: string
  altitude_m: number
  speed_ms: number
  overlap_percent: number
  waypoints: {
    coordinates: [number, number][]
    type: string
  }
  estimated_duration_min: number
  created_at: string
  scheduled_for: string
}

export default function FlightPlanDetailPage() {
  return (
    <ProtectedRoute>
      <FlightPlanDetailContent />
    </ProtectedRoute>
  )
}

function FlightPlanDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { user, isDemo } = useAuth()
  const [flightPlan, setFlightPlan] = useState<FlightPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const planId = params.id as string
    
    if (!planId || planId === 'undefined') {
      console.error('Invalid flight plan ID:', planId)
      router.push('/dashboard?tab=flights')
      return
    }
    
    if (isDemo) {
      // Load demo flight plan - support multiple demo IDs
      const demoPlans: Record<string, FlightPlan> = {
        '1': {
          id: '1',
          name: 'Weekly Survey - North Field',
          plot_id: '1',
          plot: { name: 'North Field A', area_acres: 2.5 },
          drone_model: 'DJI Mavic 3',
          altitude_m: 30,
          speed_ms: 5,
          overlap_percent: 80,
          waypoints: {
            type: 'LineString',
            coordinates: [
              [-118.4085, 34.0522],
              [-118.4086, 34.0523],
              [-118.4087, 34.0524],
              [-118.4088, 34.0525],
            ]
          },
          estimated_duration_min: 15,
          created_at: '2024-01-20',
          scheduled_for: '2024-01-25',
        },
        '2': {
          id: '2',
          name: 'Growth Check - Greenhouse B',
          plot_id: '2',
          plot: { name: 'Greenhouse Block B', area_acres: 1.8 },
          drone_model: 'DJI Air 2S',
          altitude_m: 25,
          speed_ms: 4,
          overlap_percent: 75,
          waypoints: {
            type: 'LineString',
            coordinates: [
              [-118.4090, 34.0526],
              [-118.4091, 34.0527],
              [-118.4092, 34.0528],
            ]
          },
          estimated_duration_min: 12,
          created_at: '2024-01-19',
          scheduled_for: '2024-01-26',
        }
      }
      
      // Use the plan if it exists, or use a default with the requested ID
      const plan = demoPlans[planId] || {
        ...demoPlans['1'],
        id: planId,
        name: `Flight Plan ${planId}`
      }
      
      setFlightPlan(plan)
      setLoading(false)
    } else {
      fetchFlightPlan()
    }
  }, [params.id, isDemo, router])

  const fetchFlightPlan = async () => {
    if (!user || !params.id) return

    try {
      const { data, error } = await supabase
        .from('flight_plans')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching flight plan:', error)
        setFlightPlan(null)
      } else {
        // Fetch plot data separately if needed
        if (data && data.plot_id) {
          const { data: plotData } = await supabase
            .from('plots')
            .select('name, area_acres')
            .eq('id', data.plot_id)
            .single()
          
          setFlightPlan({
            ...data,
            plot: plotData
          })
        } else {
          setFlightPlan(data)
        }
      }
    } catch (error) {
      console.error('Error in fetchFlightPlan:', error)
      setFlightPlan(null)
    } finally {
      setLoading(false)
    }
  }

  const downloadWaypoints = (format: 'kml' | 'csv' | 'json') => {
    if (!flightPlan?.waypoints?.coordinates || flightPlan.waypoints.coordinates.length === 0) {
      alert('No waypoints available for download')
      return
    }
    
    const waypoints = flightPlan.waypoints.coordinates

    if (format === 'json') {
      const data = {
        name: flightPlan.name,
        drone: flightPlan.drone_model,
        altitude_m: flightPlan.altitude_m,
        speed_ms: flightPlan.speed_ms,
        waypoints: waypoints.map((coord, index) => ({
          point: index + 1,
          longitude: coord[0],
          latitude: coord[1],
          altitude: flightPlan.altitude_m,
        }))
      }
      downloadFile(JSON.stringify(data, null, 2), `${flightPlan.name}_waypoints.json`, 'application/json')
    } else if (format === 'csv') {
      let csv = 'Point,Latitude,Longitude,Altitude(m)\n'
      waypoints.forEach((coord, index) => {
        csv += `${index + 1},${coord[1]},${coord[0]},${flightPlan.altitude_m}\n`
      })
      downloadFile(csv, `${flightPlan.name}_waypoints.csv`, 'text/csv')
    } else if (format === 'kml') {
      const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${flightPlan.name}</name>
    <Placemark>
      <name>Flight Path</name>
      <LineString>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>
${waypoints.map(coord => `          ${coord[0]},${coord[1]},${flightPlan.altitude_m}`).join('\n')}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`
      downloadFile(kml, `${flightPlan.name}_waypoints.kml`, 'application/vnd.google-earth.kml+xml')
    }
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  if (!flightPlan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Flight Plans
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Flight Plan Not Found</h1>
                <p className="text-sm text-gray-600">This flight plan doesn't exist or you don't have access to it</p>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600 mb-4">The requested flight plan could not be found.</p>
              <Link href="/dashboard?tab=flights">
                <Button className="bg-green-700 hover:bg-green-800 text-white">
                  View All Flight Plans
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard?tab=flights">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to All Flight Plans
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{flightPlan.name}</h1>
                <p className="text-sm text-gray-600">Flight plan details and waypoints</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link href={`/dashboard/flight-planner?edit=${flightPlan.id}`}>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Plan
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Flight Details Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Flight Configuration</CardTitle>
                  <CardDescription>
                    {flightPlan.plot?.name || 'Custom Area'} • {flightPlan.plot?.area_acres || 'N/A'} acres
                  </CardDescription>
                </div>
                <Badge variant="default">
                  {new Date(flightPlan.scheduled_for) > new Date() ? 'Scheduled' : 'Completed'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Drone Model</p>
                  <p className="font-medium">{flightPlan.drone_model}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Flight Altitude</p>
                  <p className="font-medium">{flightPlan.altitude_m}m</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Speed</p>
                  <p className="font-medium">{flightPlan.speed_ms} m/s</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Image Overlap</p>
                  <p className="font-medium">{flightPlan.overlap_percent}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Waypoints</p>
                  <p className="font-medium">{flightPlan.waypoints?.coordinates?.length || 0} points</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Est. Duration</p>
                  <p className="font-medium">{flightPlan.estimated_duration_min} min</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{new Date(flightPlan.created_at).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="font-medium">{new Date(flightPlan.scheduled_for).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Waypoints Card */}
          <Card>
            <CardHeader>
              <CardTitle>Download Waypoints</CardTitle>
              <CardDescription>Export flight path for your drone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => downloadWaypoints('json')}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  JSON (DJI)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadWaypoints('csv')}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadWaypoints('kml')}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  KML (Google Earth)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Flight Path Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Flight Path Preview</CardTitle>
              <CardDescription>Visual representation of the drone flight pattern</CardDescription>
            </CardHeader>
            <CardContent>
              {flightPlan.waypoints?.coordinates && flightPlan.waypoints.coordinates.length > 0 ? (
                <FlightPathPreviewMap 
                  waypoints={flightPlan.waypoints} 
                  plotName={flightPlan.plot?.name}
                />
              ) : (
                <div className="h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No waypoints available for this flight plan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}