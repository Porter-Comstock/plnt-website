// components/flight-planner.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EnhancedSatelliteMap } from '@/components/dynamic-map-wrapper'
import Link from 'next/link'
import { ArrowLeft, Save, Plane, Calendar, MapPin } from 'lucide-react'

// Using Plane icon as Drone
const Drone = Plane

interface MapArea {
  id: number
  points: { x: number; y: number; lat: number; lng: number }[]
  area: string
  coordinates: { lat: number; lng: number }[]
}

interface Plot {
  id: string
  name: string
  area_acres: number
  boundaries: any
}

export default function FlightPlannerInterface() {
  const { user, isDemo } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const plotId = searchParams.get('plot')
  const editId = searchParams.get('edit')
  
  const [name, setName] = useState('')
  const [selectedPlot, setSelectedPlot] = useState(plotId || 'custom')
  const [plots, setPlots] = useState<Plot[]>([])
  const [droneModel, setDroneModel] = useState('DJI Mavic 3')
  const [altitude, setAltitude] = useState('30')
  const [speed, setSpeed] = useState('5')
  const [overlap, setOverlap] = useState('80')
  const [plantType, setPlantType] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [mapArea, setMapArea] = useState<MapArea | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPlotBoundary, setCurrentPlotBoundary] = useState<{ lat: number; lng: number }[] | undefined>(undefined)
 
  // Add useEffect to handle plot selection changes
  useEffect(() => {
    if (selectedPlot && selectedPlot !== 'custom') {
      const selected = plots.find(p => p.id === selectedPlot)
      console.log('Selected plot:', selected) // Debug log
      
      if (selected?.boundaries) {
        let boundary: { lat: number; lng: number }[] = []
        
        // Handle different boundary formats
        if (selected.boundaries.type === 'Polygon' && selected.boundaries.coordinates?.[0]) {
          boundary = selected.boundaries.coordinates[0].map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }))
        } else if (selected.boundaries.coordinates && Array.isArray(selected.boundaries.coordinates[0])) {
          boundary = selected.boundaries.coordinates[0].map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }))
        } else if (Array.isArray(selected.boundaries)) {
          boundary = selected.boundaries.map((coord: any) => ({
            lat: coord.lat || coord[1],
            lng: coord.lng || coord[0]
          }))
        }
        
        console.log('Processed boundary:', boundary) // Debug log
        
        if (boundary.length > 0) {
          setCurrentPlotBoundary(boundary)
          
          // Calculate area
          const area = calculatePlotArea(boundary)
          
          // Generate optimized flight path
          const flightPath = generateOptimizedFlightPath(boundary)
          
          const newMapArea = {
            id: Date.now(),
            points: boundary.map((coord: { lat: number; lng: number }) => ({
              x: coord.lng,
              y: coord.lat,
              lat: coord.lat,
              lng: coord.lng
            })),
            area: `${area.toFixed(2)} acres`,
            coordinates: flightPath
          }
          
          console.log('Generated mapArea:', newMapArea) // Debug log
          setMapArea(newMapArea)
        }
      }
    } else {
      setCurrentPlotBoundary(undefined)
    }
  }, [selectedPlot, plots, altitude, overlap])

  const calculatePlotArea = (coords: { lat: number; lng: number }[]): number => {
    let area = 0
    const numPoints = coords.length

    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints
      const lat1 = coords[i].lat * Math.PI / 180
      const lat2 = coords[j].lat * Math.PI / 180
      const lng1 = coords[i].lng * Math.PI / 180
      const lng2 = coords[j].lng * Math.PI / 180

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }

    area = Math.abs(area * 6378137 * 6378137 / 2)
    return area / 4046.86 // Convert to acres
  }

  const generateOptimizedFlightPath = (boundary: { lat: number; lng: number }[]): { lat: number; lng: number }[] => {
    // Find bounds
    const lats = boundary.map(coord => coord.lat)
    const lngs = boundary.map(coord => coord.lng)
    const north = Math.max(...lats)
    const south = Math.min(...lats)
    const east = Math.max(...lngs)
    const west = Math.min(...lngs)

    // Calculate optimal line spacing based on camera FOV and overlap
    const altitudeM = parseInt(altitude) || 30
    const cameraFOV = 84 // degrees (typical for DJI drones)
    const overlapPercent = parseInt(overlap) || 80
    
    // Calculate ground coverage width
    const coverageWidth = 2 * altitudeM * Math.tan((cameraFOV / 2) * Math.PI / 180)
    const lineSpacing = coverageWidth * (1 - overlapPercent / 100)
    
    // Convert to degrees (approximate)
    const lineSpacingDeg = lineSpacing / 111320 // meters to degrees

    const flightPath: { lat: number; lng: number }[] = []
    let currentLat = south
    let lineNumber = 0

    // Generate lawnmower pattern
    while (currentLat <= north) {
      if (lineNumber % 2 === 0) {
        // Even lines: west to east
        flightPath.push({ lat: currentLat, lng: west })
        flightPath.push({ lat: currentLat, lng: east })
      } else {
        // Odd lines: east to west
        flightPath.push({ lat: currentLat, lng: east })
        flightPath.push({ lat: currentLat, lng: west })
      }
      
      currentLat += lineSpacingDeg
      lineNumber++
    }

    return flightPath
  }

  useEffect(() => {
    if (isDemo) {
      // Demo plots with actual boundary data
      const demoPlots = [
        { 
          id: '1', 
          name: 'North Field A', 
          area_acres: 2.5, 
          boundaries: {
            coordinates: [[
              [-118.2439, 34.0524],
              [-118.2436, 34.0524],
              [-118.2436, 34.0522],
              [-118.2439, 34.0522],
              [-118.2439, 34.0524]
            ]]
          }
        },
        { 
          id: '2', 
          name: 'Greenhouse Block B', 
          area_acres: 1.8, 
          boundaries: {
            coordinates: [[
              [-118.2435, 34.0521],
              [-118.2433, 34.0521],
              [-118.2433, 34.0519],
              [-118.2435, 34.0519],
              [-118.2435, 34.0521]
            ]]
          }
        },
        { 
          id: '3', 
          name: 'South Nursery', 
          area_acres: 3.2, 
          boundaries: {
            coordinates: [[
              [-118.2440, 34.0519],
              [-118.2437, 34.0519],
              [-118.2437, 34.0516],
              [-118.2440, 34.0516],
              [-118.2440, 34.0519]
            ]]
          }
        },
      ]
      setPlots(demoPlots)
      setLoading(false)
      
      // If editing, load demo data
      if (editId) {
        setName('Weekly Survey - North Field')
        setSelectedPlot('1')
        setDroneModel('DJI Mavic 3')
        setAltitude('30')
        setSpeed('5')
        setOverlap('80')
        setScheduledDate('2024-01-25')
      }
    } else {
      fetchData()
    }
  }, [isDemo, editId])

  const fetchData = async () => {
    if (!user) return

    try {
      // Fetch plots
      const { data: plotsData, error: plotsError } = await supabase
        .from('plots')
        .select('*')
        .eq('user_id', user.id)

      if (plotsError) throw plotsError
      setPlots(plotsData || [])

      // If editing, fetch the flight plan
      if (editId) {
        const { data: flightPlan, error: fpError } = await supabase
          .from('flight_plans')
          .select('*')
          .eq('id', editId)
          .eq('user_id', user.id)
          .single()

        if (fpError) throw fpError

        if (flightPlan) {
          setName(flightPlan.name)
          setSelectedPlot(flightPlan.plot_id || 'custom')
          setDroneModel(flightPlan.drone_model)
          setAltitude(flightPlan.altitude_m.toString())
          setSpeed(flightPlan.speed_ms.toString())
          setOverlap(flightPlan.overlap_percent.toString())
          if (flightPlan.scheduled_for) {
            const date = new Date(flightPlan.scheduled_for)
            setScheduledDate(date.toISOString().slice(0, 16))
          }
          if (flightPlan.waypoints) {
            // Convert waypoints to mapArea format
            setMapArea({
              id: Date.now(),
              points: [],
              area: 'Existing flight plan',
              coordinates: flightPlan.waypoints.coordinates.map((coord: number[]) => ({
                lat: coord[1],
                lng: coord[0]
              }))
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name) {
      setError('Please provide a flight plan name')
      return
    }

    if (selectedPlot === 'custom' && !mapArea) {
      setError('Please draw a survey area on the map')
      return
    }

    if (selectedPlot !== 'custom' && !selectedPlot) {
      setError('Please select a plot or choose custom area')
      return
    }

    if (isDemo) {
      // In demo mode, we need to ensure the flight plan appears in the list
      alert('Flight plan saved successfully! (Demo mode)')
      // Navigate to the flight plans list where they can see their new plan
      router.push('/dashboard?tab=flights')
      return
    }

    setSaving(true)
    setError('')

    try {
      const flightPlanData = {
        user_id: user!.id,
        plot_id: selectedPlot === 'custom' ? null : selectedPlot,
        name,
        drone_model: droneModel,
        altitude_m: parseInt(altitude),
        speed_ms: parseFloat(speed),
        overlap_percent: parseInt(overlap),
        waypoints: mapArea ? {
          type: 'LineString',
          coordinates: mapArea.coordinates.map((coord: { lat: number; lng: number }) => [coord.lng, coord.lat])
        } : null,
        estimated_duration_min: Math.round((mapArea?.coordinates.length || 0) * 0.5) || 15,
        scheduled_for: scheduledDate || new Date().toISOString(),
      }

      console.log('Saving flight plan:', flightPlanData) // Debug log

      let dbError
      let resultId = editId
      
      if (editId) {
        // Update existing flight plan
        const { error } = await supabase
          .from('flight_plans')
          .update(flightPlanData)
          .eq('id', editId)
          .eq('user_id', user!.id)
        dbError = error
      } else {
        // Insert new flight plan
        const { data, error } = await supabase
          .from('flight_plans')
          .insert(flightPlanData)
          .select()
          .single()
        dbError = error
        if (data) {
          resultId = data.id
        }
      }

      if (dbError) {
        console.error('Database error:', dbError) // Debug log
        throw dbError
      }

      console.log('Flight plan saved successfully, navigating to dashboard...') // Debug log

      // Navigate to the dashboard flight plans tab
      router.push('/dashboard?tab=flights')
    } catch (err: any) {
      setError(err.message || 'Failed to save flight plan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{editId ? 'Edit' : 'Create'} Flight Plan</h1>
              <p className="text-sm text-gray-600">Configure your drone survey mission</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Flight Area</CardTitle>
                <CardDescription>
                  Select an existing plot or draw a custom survey area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label htmlFor="plot-select">Select Existing Plot (Optional)</Label>
                  <Select value={selectedPlot} onValueChange={setSelectedPlot}>
                    <SelectTrigger id="plot-select">
                      <SelectValue placeholder="Choose a plot or draw custom area" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="custom">Custom Area (Draw on map)</SelectItem>
                      {plots.map(plot => (
                        <SelectItem key={plot.id} value={plot.id}>
                          {plot.name} ({plot.area_acres} acres)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {(!selectedPlot || selectedPlot === 'custom') && (
                  <EnhancedSatelliteMap onAreaDrawn={setMapArea} />
                )}
                
                {selectedPlot && selectedPlot !== 'custom' && (
                  <div className="relative">
                    <EnhancedSatelliteMap 
                      onAreaDrawn={setMapArea}
                      defaultCenter={
                        currentPlotBoundary && currentPlotBoundary.length > 0
                          ? [currentPlotBoundary[0].lat, currentPlotBoundary[0].lng]
                          : undefined
                      }
                      existingBoundary={currentPlotBoundary}
                    />
                    <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {plots.find(p => p.id === selectedPlot)?.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            Flight path auto-generated • {plots.find(p => p.id === selectedPlot)?.area_acres} acres
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configuration Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Flight Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="plan-name">Flight Plan Name *</Label>
                  <Input
                    id="plan-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Weekly Survey - North Field"
                    required
                  />
                </div>

                {selectedPlot === 'custom' && (
                  <div>
                    <Label htmlFor="plant-type">Plant Type</Label>
                    <Input
                      id="plant-type"
                      value={plantType}
                      onChange={(e) => setPlantType(e.target.value)}
                      placeholder="e.g., Tomatoes, Peppers, Mixed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Specify what's growing in this area</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="drone-model">Drone Model</Label>
                  <Select value={droneModel} onValueChange={setDroneModel}>
                    <SelectTrigger id="drone-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="DJI Mavic 3">DJI Mavic 3</SelectItem>
                      <SelectItem value="DJI Air 2S">DJI Air 2S</SelectItem>
                      <SelectItem value="DJI Mini 3 Pro">DJI Mini 3 Pro</SelectItem>
                      <SelectItem value="DJI Phantom 4">DJI Phantom 4</SelectItem>
                      <SelectItem value="Autel EVO II">Autel EVO II</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="altitude">Flight Altitude (meters)</Label>
                  <Input
                    id="altitude"
                    type="number"
                    value={altitude}
                    onChange={(e) => setAltitude(e.target.value)}
                    min="20"
                    max="120"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 30-50m for plant counting</p>
                </div>

                <div>
                  <Label htmlFor="speed">Flight Speed (m/s)</Label>
                  <Input
                    id="speed"
                    type="number"
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                    min="1"
                    max="15"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower speeds improve image quality</p>
                </div>

                <div>
                  <Label htmlFor="overlap">Image Overlap (%)</Label>
                  <Input
                    id="overlap"
                    type="number"
                    value={overlap}
                    onChange={(e) => setOverlap(e.target.value)}
                    min="60"
                    max="90"
                  />
                  <p className="text-xs text-gray-500 mt-1">80% recommended for accurate counting</p>
                </div>

                <div>
                  <Label htmlFor="schedule">Schedule Date</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                {mapArea && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Flight Summary</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <p>Area: {mapArea.area}</p>
                      <p>Waypoints: {mapArea.coordinates.length}</p>
                      <p>Est. Duration: {Math.round(mapArea.coordinates.length * 0.5)} min</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={saving || !name || (selectedPlot === 'custom' && !mapArea)}
                  className="w-full bg-green-700 hover:bg-green-800 text-white"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editId ? 'Update' : 'Save'} Flight Plan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mission Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Check weather conditions before flying</p>
                <p>• Ensure batteries are fully charged</p>
                <p>• Verify GPS signal strength</p>
                <p>• Maintain visual line of sight</p>
                <p>• Follow local drone regulations</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}