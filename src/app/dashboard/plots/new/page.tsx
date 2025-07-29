'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/lib/auth/protected-route'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RealSatelliteMap } from '@/components/dynamic-map-wrapper'
import Link from 'next/link'
import { ArrowLeft, Save, MapPin } from 'lucide-react'

interface MapArea {
  id: number
  points: { x: number; y: number; lat: number; lng: number }[]
  area: string
  coordinates: { lat: number; lng: number }[]
}

export default function NewPlotPage() {
  return (
    <ProtectedRoute>
      <NewPlotContent />
    </ProtectedRoute>
  )
}

function NewPlotContent() {
  const { user, isDemo } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [plantType, setPlantType] = useState('')
  const [location, setLocation] = useState('')
  const [mapArea, setMapArea] = useState<MapArea | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name || !mapArea) {
      setError('Please provide a plot name and draw the survey area on the map')
      return
    }

    if (isDemo) {
      alert('Plot saved! (Demo mode - data not persisted)')
      router.push('/dashboard?tab=plots')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('plots').insert({
        user_id: user!.id,
        name,
        plant_type: plantType,
        location: { address: location },
        boundaries: {
          type: 'Polygon',
          coordinates: [mapArea.coordinates.map(coord => [coord.lng, coord.lat])],
        },
        area_acres: parseFloat(mapArea.area),
      })

      if (dbError) throw dbError

      router.push('/dashboard?tab=plots')
    } catch (err: any) {
      setError(err.message || 'Failed to save plot')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard?tab=plots">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Plots
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Plot</h1>
              <p className="text-sm text-gray-600">Define a new survey area for your nursery</p>
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
                <CardTitle>Draw Survey Area</CardTitle>
                <CardDescription>
                  Use the tools below to define your plot boundaries on the satellite map
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RealSatelliteMap onAreaDrawn={setMapArea} />
              </CardContent>
            </Card>
          </div>

          {/* Form Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Plot Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Plot Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., North Field A"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Plant Type</label>
                  <Input
                    value={plantType}
                    onChange={(e) => setPlantType(e.target.value)}
                    placeholder="e.g., Tomatoes, Peppers, Mixed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location/Address</label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., 123 Farm Road"
                  />
                </div>

                {mapArea && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Survey Area Defined</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <p>Area: {mapArea.area}</p>
                      <p>Waypoints: {mapArea.points.length}</p>
                      <p>GPS Points: {mapArea.coordinates.length}</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={saving || !name || !mapArea}
                  className="w-full bg-green-700 hover:bg-green-800 text-white"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Plot
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Click "Draw Survey Area" then click points on the map</p>
                <p>• Create at least 3 points to define the area</p>
                <p>• Click "Finish Area" to complete the boundary</p>
                <p>• The flight path will be automatically optimized</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}