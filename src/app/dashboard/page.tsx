// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/lib/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import {
  BarChart3,
  Plane,
  MapPin,
  Calendar,
  TrendingUp,
  Plus,
  Settings,
  LogOut,
  Users,
  Clock,
  Cloud,
  AlertCircle,
  CheckCircle2,
  Eye,
  Upload,
  Activity,
  Trash2,
} from 'lucide-react'

interface Plot {
  id: string
  name: string
  area_acres: number
  plant_type: string
  created_at: string
  last_flight?: string
  plant_count?: number
}

interface FlightPlan {
  id: string
  name: string
  plot_id: string
  scheduled_for: string
  drone_model: string
  status: string
  altitude_m?: number
  estimated_duration_min?: number
}

interface DashboardStats {
  totalPlots: number
  totalFlights: number
  totalPlants: number
  activeFlightPlans: number
  avgAccuracy: number
  flightHours: number
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, userProfile, signOut, isDemo } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'overview')
  const [plots, setPlots] = useState<Plot[]>([])
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalPlots: 0,
    totalFlights: 0,
    totalPlants: 0,
    activeFlightPlans: 0,
    avgAccuracy: 99.5,
    flightHours: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all')

  // Update activeTab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Refetch data when tab changes to flights
  useEffect(() => {
    if (activeTab === 'flights' && !isDemo && user) {
      // Refetch flight plans when switching to flights tab
      supabase
        .from('flight_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setFlightPlans(data)
          }
        })
    }
  }, [activeTab, isDemo, user])

  useEffect(() => {
    if (isDemo) {
      // Load demo data
      setPlots([
        {
          id: '1',
          name: 'North Field A',
          area_acres: 2.5,
          plant_type: 'Tomatoes',
          created_at: '2024-01-15',
          last_flight: '2024-01-18',
          plant_count: 1247,
        },
        {
          id: '2',
          name: 'Greenhouse Block B',
          area_acres: 1.8,
          plant_type: 'Peppers',
          created_at: '2024-01-10',
          last_flight: '2024-01-17',
          plant_count: 892,
        },
        {
          id: '3',
          name: 'South Nursery',
          area_acres: 3.2,
          plant_type: 'Herbs',
          created_at: '2024-01-05',
          last_flight: '2024-01-16',
          plant_count: 1508,
        },
      ])
      setStats({
        totalPlots: 3,
        totalFlights: 12,
        totalPlants: 3647,
        activeFlightPlans: 2,
        avgAccuracy: 99.5,
        flightHours: 24.5,
      })
      setFlightPlans([
        {
          id: '1',
          name: 'Weekly Survey - North Field',
          plot_id: '1',
          scheduled_for: '2024-01-25',
          drone_model: 'DJI Mavic 3',
          status: 'scheduled',
        },
        {
          id: '2',
          name: 'Growth Check - Greenhouse',
          plot_id: '2',
          scheduled_for: '2024-01-26',
          drone_model: 'DJI Air 2S',
          status: 'scheduled',
        },
      ])
      setLoading(false)
    } else {
      // Fetch real data from Supabase
      fetchUserData()
    }
  }, [isDemo])

  const fetchUserData = async () => {
    if (!user) return

    try {
      // Fetch plots
      const { data: plotsData, error: plotsError } = await supabase
        .from('plots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (plotsError) {
        console.error('Error fetching plots:', plotsError)
      } else {
        setPlots(plotsData || [])
      }

      // Fetch flight plans
      const { data: plansData, error: plansError } = await supabase
        .from('flight_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false })

      if (plansError) {
        console.error('Error fetching flight plans:', plansError)
      } else {
        setFlightPlans(plansData || [])
        console.log('Fetched flight plans:', plansData) // Debug log
      }

      // Calculate stats
      const { data: flightsData } = await supabase
        .from('flights')
        .select('*')
        .eq('status', 'completed')

      const { data: countsData } = await supabase
        .from('plant_counts')
        .select('count')

      const totalPlants = countsData?.reduce((sum, item) => sum + item.count, 0) || 0
      const totalFlights = flightsData?.length || 0
      const flightHours = flightsData?.reduce((sum, flight) => {
        if (flight.started_at && flight.completed_at) {
          const duration = new Date(flight.completed_at).getTime() - new Date(flight.started_at).getTime()
          return sum + duration / (1000 * 60 * 60)
        }
        return sum
      }, 0) || 0

      setStats({
        totalPlots: plotsData?.length || 0,
        totalFlights,
        totalPlants,
        activeFlightPlans: plansData?.filter(p => p.scheduled_for && new Date(p.scheduled_for) > new Date()).length || 0,
        avgAccuracy: 99.5,
        flightHours: Math.round(flightHours * 10) / 10,
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeatherStatus = () => {
    const conditions = ['Excellent', 'Good', 'Fair', 'Poor']
    const icons = [CheckCircle2, Cloud, Cloud, AlertCircle]
    const colors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-red-600']
    const index = Math.floor(Math.random() * conditions.length)
    const Icon = icons[index]
    
    return (
      <div className={`flex items-center space-x-2 ${colors[index]}`}>
        <Icon className="w-5 h-5" />
        <span className="font-medium">{conditions[index]} conditions</span>
      </div>
    )
  }

  const getStatus = (scheduledFor: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledFor)
    return scheduled > now ? 'scheduled' : 'completed'
  }

  const getPlotName = (plotId: string | null) => {
    if (!plotId) return 'Custom Area'
    const plot = plots.find(p => p.id === plotId)
    return plot?.name || 'Unknown Plot'
  }

  const getPlotArea = (plotId: string | null) => {
    if (!plotId) return 'N/A'
    const plot = plots.find(p => p.id === plotId)
    return plot?.area_acres ? `${plot.area_acres} acres` : 'N/A'
  }

  const deleteFlight = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flight plan?')) return

    if (isDemo) {
      setFlightPlans(flightPlans.filter(fp => fp.id !== id))
      return
    }

    try {
      const { error } = await supabase
        .from('flight_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id)

      if (error) throw error
      setFlightPlans(flightPlans.filter(fp => fp.id !== id))
    } catch (error) {
      console.error('Error deleting flight plan:', error)
      alert('Failed to delete flight plan')
    }
  }

  const filteredPlans = flightPlans.filter(plan => {
    if (filter === 'all') return true
    const status = getStatus(plan.scheduled_for)
    return status === filter
  })

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Image src="/images/plnt-logo.svg" alt="PLNT Logo" width={150} height={50} className="h-12 w-auto" priority />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                {isDemo ? 'Demo Mode' : `Welcome back, ${userProfile?.company_name || userProfile?.display_name || user?.email || 'User'}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {getWeatherStatus()}
            {isDemo ? (
              <Link href="/auth/signup">
                <Button className="bg-green-700 hover:bg-green-800 text-white">
                  Upgrade to Full Access
                </Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isDemo && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <p className="text-blue-800">
                <strong>Demo Mode:</strong> You're viewing sample data. 
                <Link href="/auth/signup" className="ml-2 underline font-medium">
                  Create an account
                </Link> to save your flight plans and access all features.
              </p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plots">My Plots</TabsTrigger>
            <TabsTrigger value="flights">Flight Plans</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Plots</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalPlots}</p>
                    </div>
                    <MapPin className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Flights</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalFlights}</p>
                    </div>
                    <Plane className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Plants Counted</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalPlants.toLocaleString()}</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Plans</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeFlightPlans}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Accuracy</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.avgAccuracy}%</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Flight Hours</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.flightHours}</p>
                    </div>
                    <Clock className="w-8 h-8 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/dashboard/flight-planner">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Plane className="w-6 h-6 text-green-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Create Flight Plan</h3>
                        <p className="text-sm text-gray-600">Plan a new survey mission</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/plots/new">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-blue-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Add New Plot</h3>
                        <p className="text-sm text-gray-600">Define a new survey area</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/upload">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-purple-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Upload Images</h3>
                        <p className="text-sm text-gray-600">Process drone imagery</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Flights</CardTitle>
                <CardDescription>Your latest survey missions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plots.slice(0, 3).map((plot) => (
                    <div key={plot.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{plot.name}</p>
                          <p className="text-sm text-gray-600">
                            {plot.last_flight || 'No flights yet'} • {plot.plant_count?.toLocaleString() || 0} plants
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/plots/${plot.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plots Tab */}
          <TabsContent value="plots" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">My Plots</h2>
                <p className="text-gray-600">Manage your nursery survey areas</p>
              </div>
              <Link href="/dashboard/plots/new">
                <Button className="bg-green-700 hover:bg-green-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Plot
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plots.map((plot) => (
                <Card key={plot.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plot.name}</CardTitle>
                      <Badge variant="secondary">{plot.plant_type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Area:</span>
                        <span className="font-medium">{plot.area_acres} acres</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Flight:</span>
                        <span className="font-medium">{plot.last_flight || 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plant Count:</span>
                        <span className="font-medium">{plot.plant_count?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Link href={`/dashboard/plots/${plot.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/dashboard/flight-planner?plot=${plot.id}`} className="flex-1">
                        <Button className="w-full bg-green-700 hover:bg-green-800 text-white" size="sm">
                          <Plane className="w-4 h-4 mr-2" />
                          Plan Flight
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Flight Plans Tab */}
          <TabsContent value="flights" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Flight Plans</h2>
                <p className="text-gray-600">Manage your drone survey missions</p>
              </div>
              <Link href="/dashboard/flight-planner">
                <Button className="bg-green-700 hover:bg-green-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Flight Plan
                </Button>
              </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({flightPlans.length})
              </Button>
              <Button
                variant={filter === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('scheduled')}
              >
                Scheduled ({flightPlans.filter(p => getStatus(p.scheduled_for) === 'scheduled').length})
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                Completed ({flightPlans.filter(p => getStatus(p.scheduled_for) === 'completed').length})
              </Button>
            </div>

            {/* Flight Plans Grid */}
            {filteredPlans.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No flight plans yet</h3>
                  <p className="text-gray-600 mb-4">Create your first flight plan to get started</p>
                  <Link href="/dashboard/flight-planner">
                    <Button className="bg-green-700 hover:bg-green-800 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Flight Plan
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => {
                  const status = getStatus(plan.scheduled_for)
                  const plotName = getPlotName(plan.plot_id)
                  const plotArea = getPlotArea(plan.plot_id)
                  
                  return (
                    <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription>{plotName}</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Status</span>
                            <Badge variant={status === 'scheduled' ? 'default' : 'secondary'}>
                              {status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">Drone</p>
                              <p className="font-medium">{plan.drone_model}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Area</p>
                              <p className="font-medium">{plotArea}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Altitude</p>
                              <p className="font-medium">{plan.altitude_m || 'N/A'}m</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Duration</p>
                              <p className="font-medium">{plan.estimated_duration_min || 'N/A'} min</p>
                            </div>
                          </div>
                          
                          <div className="pt-2 space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              {new Date(plan.scheduled_for).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              {new Date(plan.scheduled_for).toLocaleTimeString()}
                            </div>
                          </div>
                          
                          <div className="pt-3 flex space-x-2">
                            <Link href={`/dashboard/flight-plans/${plan.id}`} className="flex-1">
                              <Button className="w-full bg-green-700 hover:bg-green-800 text-white" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => deleteFlight(plan.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Analytics</h2>
              <p className="text-gray-600">Track your nursery performance over time</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Plant Count Trends</CardTitle>
                  <CardDescription>Monthly plant count across all plots</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Plant growth chart</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Flight Efficiency</CardTitle>
                  <CardDescription>Coverage area per flight hour</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Efficiency metrics</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Settings</h2>
              <p className="text-gray-600">Manage your account and preferences</p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="mt-1">{isDemo ? 'demo@plnt.tech' : user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Type</label>
                    <p className="mt-1">{isDemo ? 'Demo Account' : 'Professional'}</p>
                  </div>
                  {isDemo && (
                    <Link href="/auth/signup">
                      <Button className="bg-green-700 hover:bg-green-800 text-white">
                        Upgrade to Full Account
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Drone Fleet</CardTitle>
                  <CardDescription>Manage your drone configurations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">DJI Mavic 3</p>
                        <p className="text-sm text-gray-600">Primary drone</p>
                      </div>
                      <Button variant="ghost" size="sm">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">DJI Air 2S</p>
                        <p className="text-sm text-gray-600">Backup drone</p>
                      </div>
                      <Button variant="ghost" size="sm">Configure</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}