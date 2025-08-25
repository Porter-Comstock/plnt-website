// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { 
  Plane, MapPin, Camera, Leaf, TrendingUp,
  Calendar, ChevronRight, Plus, Upload, BarChart3, 
  Clock, Search, Filter, MoreVertical, Edit, Trash2,
  CheckCircle2, AlertCircle, PlayCircle, FileText,
  Activity, Users, Settings, HelpCircle, LogOut,
  Home, Map, Eye, Lock
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalPlots: number
  totalFlights: number
  totalPlants: number
  pendingUploads: number
  recentFlights: any[]
  upcomingMissions: any[]
  plotsList: any[]
  flightPlans: any[]
}

function DashboardContent() {
  const { user, userProfile, isDemo, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [stats, setStats] = useState<DashboardStats>({
    totalPlots: 0,
    totalFlights: 0,
    totalPlants: 0,
    pendingUploads: 0,
    recentFlights: [],
    upcomingMissions: [],
    plotsList: [],
    flightPlans: []
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [flightSearchQuery, setFlightSearchQuery] = useState('')
  const [userRole, setUserRole] = useState<string>('viewer')
  
  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setUserRole(profile?.role || 'viewer')
    }
  }

  useEffect(() => {
    loadDashboardData()
    checkRole()
  }, [])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const loadDashboardData = async () => {
  console.log('Loading dashboard data...')
  console.log('isDemo from context:', isDemo)
  
  if (isDemo) {
    console.log('Loading demo data...')
    // Your demo data...
    setStats({
        totalPlots: 3,
        totalFlights: 12,
        totalPlants: 14847,
        pendingUploads: 2,
        recentFlights: [
          {
            id: '1',
            name: 'North Field Survey',
            completed_at: new Date().toISOString(),
            plant_count: 1247,
            status: 'completed',
            images_captured: 147,
            flight_plans: { name: 'North Field Survey' },
            plant_counts: [{ count: 1247 }]
          },
          {
            id: '2',
            name: 'Greenhouse Check',
            completed_at: new Date(Date.now() - 86400000).toISOString(),
            plant_count: 892,
            status: 'completed',
            images_captured: 98,
            flight_plans: { name: 'Greenhouse Check' },
            plant_counts: [{ count: 892 }]
          }
        ],
        upcomingMissions: [
          {
            id: '1',
            name: 'Weekly Survey - South',
            scheduled_for: new Date(Date.now() + 86400000).toISOString(),
            plot_name: 'South Nursery',
            drone_model: 'DJI Mavic 3',
            status: 'scheduled'
          }
        ],
        plotsList: [
          {
            id: '1',
            name: 'North Field A',
            area_acres: 2.5,
            plant_type: 'Tomatoes',
            last_surveyed: new Date(Date.now() - 86400000).toISOString(),
            plant_count: 1247
          },
          {
            id: '2',
            name: 'Greenhouse Block B',
            area_acres: 1.8,
            plant_type: 'Peppers',
            last_surveyed: new Date(Date.now() - 172800000).toISOString(),
            plant_count: 892
          },
          {
            id: '3',
            name: 'South Nursery',
            area_acres: 3.2,
            plant_type: 'Mixed Herbs',
            last_surveyed: new Date(Date.now() - 604800000).toISOString(),
            plant_count: 1456
          }
        ],
        flightPlans: [
          {
            id: '1',
            name: 'North Field Survey',
            plot_name: 'North Field A',
            scheduled_for: new Date(Date.now() + 86400000).toISOString(),
            drone_model: 'DJI Mavic 3',
            status: 'scheduled',
            altitude_m: 30,
            estimated_duration_min: 15
          },
          {
            id: '2',
            name: 'Greenhouse Inspection',
            plot_name: 'Greenhouse Block B',
            scheduled_for: new Date(Date.now() + 172800000).toISOString(),
            drone_model: 'DJI Air 2S',
            status: 'draft',
            altitude_m: 25,
            estimated_duration_min: 12
          },
          {
            id: '3',
            name: 'Weekly Plant Count',
            plot_name: 'South Nursery',
            scheduled_for: new Date(Date.now() + 259200000).toISOString(),
            drone_model: 'DJI Mavic 3',
            status: 'draft',
            altitude_m: 35,
            estimated_duration_min: 20
          }
        ]
      })
      setLoading(false)
      return
    }
    
    // Real data fetch
    try {
      const [plotsRes, flightsRes, countsRes, plansRes] = await Promise.all([
        supabase.from('plots').select('*').eq('user_id', user?.id),
        supabase.from('flights').select('*, flight_plans(name), plant_counts(count)').eq('user_id', user?.id).order('completed_at', { ascending: false }),
        supabase.from('plant_counts').select('count').eq('user_id', user?.id),
        supabase.from('flight_plans').select('*, plots(name)').eq('user_id', user?.id).order('scheduled_for', { ascending: false })
      ])

      const totalPlants = countsRes.data?.reduce((sum, pc) => sum + pc.count, 0) || 0
      const pendingUploads = flightsRes.data?.filter(f => f.status === 'completed' && !f.plant_counts?.length).length || 0

      setStats({
        totalPlots: plotsRes.data?.length || 0,
        totalFlights: flightsRes.data?.filter(f => f.status === 'completed').length || 0,
        totalPlants,
        pendingUploads,
        recentFlights: flightsRes.data?.slice(0, 5) || [],
        upcomingMissions: plansRes.data?.filter(p => new Date(p.scheduled_for) > new Date()).slice(0, 3) || [],
        plotsList: plotsRes.data || [],
        flightPlans: plansRes.data || []
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlot = async (plotId: string) => {
    if (!confirm('Are you sure you want to delete this plot?')) return
    
    try {
      const { error } = await supabase
        .from('plots')
        .delete()
        .eq('id', plotId)
        .eq('user_id', user?.id)
      
      if (error) throw error
      loadDashboardData()
    } catch (error) {
      console.error('Error deleting plot:', error)
    }
  }

  const handleDeleteFlightPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this flight plan?')) return
    
    try {
      const { error } = await supabase
        .from('flight_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user?.id)
      
      if (error) throw error
      loadDashboardData()
    } catch (error) {
      console.error('Error deleting flight plan:', error)
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Image 
                src="/images/plnt-logo.svg" 
                alt="PLNT Logo" 
                width={150} 
                height={50} 
                className="h-12 w-auto" 
                priority 
              />
            </Link>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`font-medium ${activeTab === 'overview' ? 'text-green-700' : 'text-gray-700 hover:text-green-700'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('plots')}
              className={`font-medium ${activeTab === 'plots' ? 'text-green-700' : 'text-gray-700 hover:text-green-700'}`}
            >
              Plots
            </button>
            <button 
              onClick={() => setActiveTab('flights')}
              className={`font-medium ${activeTab === 'flights' ? 'text-green-700' : 'text-gray-700 hover:text-green-700'}`}
            >
              Flight Plans
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={`font-medium ${activeTab === 'results' ? 'text-green-700' : 'text-gray-700 hover:text-green-700'}`}
            >
              Results
            </button>
            <Link href="/dashboard/analytics" className="text-gray-700 hover:text-green-700 font-medium">
              Analytics
            </Link>
          </nav>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/flight-planner">
              <Button className="bg-green-700 hover:bg-green-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Flight
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              onClick={() => signOut()}
              className="text-gray-700 hover:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Quick Access (only for admins) */}
      {userRole === 'admin' && (
        <div className="container mx-auto px-4 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-red-900">Admin Tools Available</h3>
                  <p className="text-sm text-red-700">Access training data management tools</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/admin/upload-training">
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                    Upload Training Images
                  </Button>
                </Link>
                <Link href="/dashboard/admin/annotate">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                    Annotate Data
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Quick Stats - Only on Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Plots</CardTitle>
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPlots}</div>
                    <p className="text-xs text-gray-500 mt-1">Active areas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Flights</CardTitle>
                    <Plane className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalFlights}</div>
                    <p className="text-xs text-gray-500 mt-1">Total missions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Plants Counted</CardTitle>
                    <Leaf className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPlants.toLocaleString()}</div>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12% vs last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Uploads</CardTitle>
                    <Upload className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingUploads}</div>
                    {stats.pendingUploads > 0 && (
                      <Link href="/dashboard/upload">
                        <p className="text-xs text-blue-600 mt-1 hover:underline cursor-pointer">
                          Upload now →
                        </p>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions - Only on Overview */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <Link href="/dashboard/flight-planner">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <Plus className="w-8 h-8 text-green-600 mb-2" />
                      <h3 className="font-semibold">New Flight Plan</h3>
                      <p className="text-sm text-gray-500 mt-1">Create mission</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/dashboard/test-flight">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <Plane className="w-8 h-8 text-blue-600 mb-2" />
                      <h3 className="font-semibold">Test Flight</h3>
                      <p className="text-sm text-gray-500 mt-1">Simulate mission</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/dashboard/upload">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <Camera className="w-8 h-8 text-purple-600 mb-2" />
                      <h3 className="font-semibold">Upload Images</h3>
                      <p className="text-sm text-gray-500 mt-1">Process photos</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/dashboard/analytics">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <BarChart3 className="w-8 h-8 text-orange-600 mb-2" />
                      <h3 className="font-semibold">View Analytics</h3>
                      <p className="text-sm text-gray-500 mt-1">Track trends</p>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Flights */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Flights</CardTitle>
                    <CardDescription>Your latest completed missions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stats.recentFlights.length === 0 ? (
                      <div className="text-center py-8">
                        <Plane className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No flights completed yet</p>
                        <Link href="/dashboard/test-flight">
                          <Button variant="outline" size="sm" className="mt-4">
                            Test Flight Simulator
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      stats.recentFlights.slice(0, 5).map(flight => (
                        <div key={flight.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{flight.flight_plans?.name || 'Unnamed'}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(flight.completed_at).toLocaleDateString()} • 
                              {flight.plant_counts?.[0]?.count || 0} plants
                            </p>
                          </div>
                          <Link href={`/dashboard/flights/${flight.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Missions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Missions</CardTitle>
                    <CardDescription>Scheduled flight plans</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stats.upcomingMissions.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm mb-4">No upcoming missions</p>
                        <Link href="/dashboard/flight-planner">
                          <Button variant="outline" size="sm">
                            Schedule Mission
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      stats.upcomingMissions.map(mission => (
                        <div key={mission.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{mission.name}</p>
                            <p className="text-sm text-gray-500">
                              {mission.plot_name} • {new Date(mission.scheduled_for).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge>{mission.status}</Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Plots Tab */}
          {activeTab === 'plots' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  type="search"
                  placeholder="Search plots..."
                  className="w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Link href="/dashboard/plots/new">
                  <Button className="bg-green-700 hover:bg-green-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Plot
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.plotsList.filter(plot => 
                  plot.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map(plot => (
                  <Card key={plot.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{plot.name}</CardTitle>
                      <CardDescription>{plot.plant_type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Area</span>
                          <span className="font-medium">{plot.area_acres} acres</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Plant Count</span>
                          <span className="font-medium">{plot.plant_count?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Survey</span>
                          <span className="font-medium">
                            {plot.last_surveyed 
                              ? new Date(plot.last_surveyed).toLocaleDateString()
                              : 'Never'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Link href={`/dashboard/flight-planner?plot=${plot.id}`}>
                          <Button className="w-full bg-green-700 hover:bg-green-800 text-white">
                            <Plane className="w-4 h-4 mr-2" />
                            Schedule Survey
                          </Button>
                        </Link>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1" 
                            variant="outline"
                            onClick={() => router.push(`/dashboard/plots/${plot.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            className="flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-300" 
                            variant="outline"
                            onClick={() => handleDeletePlot(plot.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Flight Plans Tab */}
          {activeTab === 'flights' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Input
                  type="search"
                  placeholder="Search flight plans..."
                  className="w-64"
                  value={flightSearchQuery}
                  onChange={(e) => setFlightSearchQuery(e.target.value)}
                />
                <Link href="/dashboard/flight-planner">
                  <Button className="bg-green-700 hover:bg-green-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    New Flight Plan
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.flightPlans.filter(plan => 
                  plan.name.toLowerCase().includes(flightSearchQuery.toLowerCase()) ||
                  (plan.plot_name && plan.plot_name.toLowerCase().includes(flightSearchQuery.toLowerCase()))
                ).map(plan => (
                  <Card key={plan.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.plots?.name || plan.plot_name || 'Custom Area'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Scheduled</span>
                          <span className="font-medium">
                            {new Date(plan.scheduled_for).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Drone</span>
                          <span className="font-medium">{plan.drone_model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Altitude</span>
                          <span className="font-medium">{plan.altitude_m}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duration</span>
                          <span className="font-medium">{plan.estimated_duration_min} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <Badge variant={
                            plan.status === 'completed' ? 'default' :
                            plan.status === 'scheduled' ? 'secondary' :
                            'outline'
                          }>
                            {plan.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Link href={`/dashboard/flight-planner?edit=${plan.id}`}>
                          <Button className="w-full bg-green-700 hover:bg-green-800 text-white">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1" 
                            variant="outline"
                            onClick={() => router.push(`/dashboard/flight-planner?edit=${plan.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            className="flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-300" 
                            variant="outline"
                            onClick={() => handleDeleteFlightPlan(plan.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Processing Results</h3>
                <Link href="/dashboard/analytics">
                  <Button variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </Link>
              </div>

              <div className="grid gap-4">
                {stats.recentFlights.filter(f => f.plant_counts?.length > 0).map(flight => (
                  <Card key={flight.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                          <div>
                            <h4 className="font-semibold">{flight.flight_plans?.name}</h4>
                            <p className="text-sm text-gray-500">
                              Completed {new Date(flight.completed_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {flight.plant_counts?.[0]?.count?.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">plants detected</p>
                        </div>
                        <Link href={`/dashboard/flights/${flight.id}`}>
                          <Button variant="outline">View Details</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  const { user, loading, isDemo, setIsDemo } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Check if demo parameter is in URL
    const demoParam = searchParams.get('demo')
    if (demoParam === 'true') {
      setIsDemo(true)
    }
  }, [searchParams, setIsDemo])
  
  useEffect(() => {
    console.log('Dashboard auth check - user:', user, 'isDemo:', isDemo, 'loading:', loading)
    
    // Only redirect if loading is complete AND no access
    if (!loading && !user && !isDemo) {
      console.log('No access, redirecting to signin...')
      router.push('/auth/signin')
    }
  }, [user, loading, isDemo, router])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    )
  }
  
  // Allow access if authenticated OR in demo mode
  if (!user && !isDemo) {
    console.log('No access after loading complete')
    return null
  }
  
  console.log('Rendering dashboard content - isDemo:', isDemo, 'user:', user)
  return <DashboardContent />
}