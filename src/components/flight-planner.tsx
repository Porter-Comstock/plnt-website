"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RealSatelliteMap from "./real-satellite-map"
import {
  MapPin,
  DrillIcon as Drone,
  Settings,
  BarChart3,
  Calendar,
  Download,
  Play,
  Pause,
  CloudSun,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface SurveyArea {
  area: string
  points?: { x: number; y: number }[]
  coordinates?: { lat: number; lng: number }[]
}

interface DroneModel {
  name: string
  maxAlt: number
  flightTime: number
  batteryLife: string
}

interface SavedPlot {
  id: number
  name: string
  plantType: string
  area: string
  lastFlown: string
}

// Simplified version of your flight planner for web integration
export default function FlightPlannerInterface() {
  const [activeTab, setActiveTab] = useState("planner")
  const [selectedDrone, setSelectedDrone] = useState("dji-mini-3")
  const [altitude, setAltitude] = useState(30)
  const [speed, setSpeed] = useState(3)
  const [overlap, setOverlap] = useState(80)
  const [flightStatus, setFlightStatus] = useState("ready") // ready, planning, flying, completed
  const [weatherCondition, setWeatherCondition] = useState("excellent")
  const [plantCount, setPlantCount] = useState(0)
  const [surveyArea, setSurveyArea] = useState<SurveyArea | null>(null)
  const [savedPlots] = useState<SavedPlot[]>([
    { id: 1, name: "North Field A", plantType: "Tomatoes", area: "2.5 acres", lastFlown: "2024-01-15" },
    { id: 2, name: "Greenhouse Block B", plantType: "Peppers", area: "1.8 acres", lastFlown: "2024-01-12" },
    { id: 3, name: "South Nursery", plantType: "Herbs", area: "3.2 acres", lastFlown: "2024-01-10" },
  ])

  const droneModels: Record<string, DroneModel> = {
    "dji-mini-3": { name: "DJI Mini 3", maxAlt: 120, flightTime: 38, batteryLife: "85%" },
    "dji-air-2s": { name: "DJI Air 2S", maxAlt: 120, flightTime: 31, batteryLife: "92%" },
    "dji-mavic-3": { name: "DJI Mavic 3", maxAlt: 120, flightTime: 46, batteryLife: "78%" },
  }

  const simulateFlightPlanning = () => {
    if (!surveyArea) {
      alert("Please draw a survey area first using the map tools!")
      return
    }

    setFlightStatus("planning")
    setTimeout(() => {
      setFlightStatus("ready")
      alert(
        `Flight plan generated!\n\nSurvey area: ${surveyArea.area}\nWaypoints: ${surveyArea.points?.length || 0}\nEstimated flight time: 8-12 minutes\nCoordinates: ${surveyArea.coordinates?.length || 0} GPS points recorded`,
      )
    }, 2000)
  }

  const simulateFlightExecution = () => {
    if (!surveyArea) {
      alert("Please generate a flight plan first!")
      return
    }

    setFlightStatus("flying")

    // Calculate realistic flight parameters
    const currentDroneSpecs = droneModels[selectedDrone]
    const imageFootprintWidth = (0.75 * 4000) / 100 // Simplified GSD calculation
    const imageFootprintHeight = (0.75 * 3000) / 100
    const spacingX = imageFootprintWidth * (1 - overlap / 100)
    const spacingY = imageFootprintHeight * (1 - 80 / 100) // side overlap

    // Estimate survey area and flight time
    const estimatedArea = Number.parseFloat(surveyArea.area) || 2.5 // acres
    const totalDistance = (estimatedArea * 4047) / Math.min(spacingX, spacingY) // rough calculation
    const flightTime = Math.ceil(totalDistance / speed / 60)
    const batteryUsage = Math.ceil((flightTime / currentDroneSpecs.flightTime) * 100)

    // Simulate realistic flight progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 5

      if (progress >= 100) {
        clearInterval(interval)
        setFlightStatus("completed")

        // Generate realistic plant count based on area and plant density
        const plantDensity = Math.floor(Math.random() * 200) + 100 // plants per acre
        const calculatedPlantCount = Math.floor(estimatedArea * plantDensity)
        setPlantCount(calculatedPlantCount)

        alert(
          `Flight executed successfully!\n\nDetails:\n• Plants detected: ${calculatedPlantCount}\n• Flight time: ${flightTime} minutes\n• Battery used: ${batteryUsage}%\n• Distance covered: ${totalDistance.toFixed(0)}m\n• Weather: ${weatherCondition}\n• GPS coordinates: ${surveyArea.coordinates?.length || 0} points\n\nFlight logged for analytics`,
        )
      }
    }, 800)
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "excellent":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "good":
        return <CloudSun className="w-5 h-5 text-blue-600" />
      case "poor":
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <CloudSun className="w-5 h-5 text-gray-600" />
    }
  }

  const checkWeatherConditions = () => {
    const conditions = ["excellent", "good", "fair", "poor"]
    const scores = [95, 78, 55, 25]
    const warnings: Record<string, string[]> = {
      excellent: [],
      good: ["Light wind detected"],
      fair: ["Moderate wind - exercise caution", "Overcast conditions"],
      poor: ["High wind speed - drone may be unstable", "Poor visibility conditions"],
    }

    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)]
    setWeatherCondition(randomCondition)

    const conditionIndex = conditions.indexOf(randomCondition)
    const score = scores[conditionIndex]
    const conditionWarnings = warnings[randomCondition] || []

    alert(
      `Weather Check Complete!\n\nCondition: ${randomCondition.toUpperCase()}\nScore: ${score}/100\n${conditionWarnings.length > 0 ? "\nWarnings:\n• " + conditionWarnings.join("\n• ") : "\n✅ Perfect flying conditions!"}`,
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Image
              src="/images/plnt-logo.svg"
              alt="PLNT Logo"
              width={120}
              height={40}
              className="h-8 w-auto cursor-pointer"
            />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Flight Planning Dashboard</h1>
            <p className="text-gray-600">Plan and analyze your drone flight plans</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getWeatherIcon(weatherCondition)}
            <span className="text-sm font-medium capitalize">{weatherCondition} conditions</span>
          </div>
          <Badge variant={flightStatus === "flying" ? "default" : "secondary"}>
            {flightStatus === "flying" ? "Flight Active" : "Ready"}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="planner" className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Flight Planner</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Scheduler</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Map Area */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Survey Area - Live Satellite View</span>
                  </CardTitle>
                  <CardDescription>Draw your survey area on satellite imagery with GPS coordinates</CardDescription>
                </CardHeader>
                <CardContent>
                  <RealSatelliteMap onAreaDrawn={setSurveyArea} />
                </CardContent>
              </Card>
            </div>

            {/* Controls Panel */}
            <div className="space-y-6">
              {/* Survey Area Info */}
              {surveyArea && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700">✅ Survey Area Defined</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <strong>Area:</strong> {surveyArea.area}
                    </div>
                    <div>
                      <strong>Waypoints:</strong> {surveyArea.points?.length || 0}
                    </div>
                    <div>
                      <strong>GPS Coordinates:</strong> {surveyArea.coordinates?.length || 0} points
                    </div>
                    <div>
                      <strong>Est. Flight Time:</strong> {Math.ceil((Number.parseFloat(surveyArea.area) || 2.5) * 3.5)}{" "}
                      minutes
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Ready for flight planning</div>
                  </CardContent>
                </Card>
              )}

              {/* Drone Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Drone className="w-5 h-5" />
                    <span>Drone Setup</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Drone Model</label>
                    <select
                      value={selectedDrone}
                      onChange={(e) => setSelectedDrone(e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                    >
                      {Object.entries(droneModels).map(([key, drone]) => (
                        <option key={key} value={key}>
                          {drone.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="font-medium">Remaining Flight Time</div>
                      <div className="text-gray-600">{droneModels[selectedDrone].flightTime} min</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="font-medium">Battery</div>
                      <div className="text-green-600">{droneModels[selectedDrone].batteryLife}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Flight Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle>Flight Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Altitude (m)</label>
                    <Input
                      type="number"
                      value={altitude}
                      onChange={(e) => setAltitude(Number(e.target.value))}
                      min="10"
                      max="120"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Speed (m/s)</label>
                    <Input
                      type="number"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      min="1"
                      max="15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Overlap (%)</label>
                    <Input
                      type="number"
                      value={overlap}
                      onChange={(e) => setOverlap(Number(e.target.value))}
                      min="50"
                      max="90"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Flight Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Flight Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={checkWeatherConditions} variant="outline" className="w-full mb-2 bg-transparent">
                    <CloudSun className="w-4 h-4 mr-2" />
                    Check Weather Conditions
                  </Button>
                  <Button
                    onClick={simulateFlightPlanning}
                    disabled={flightStatus === "planning" || flightStatus === "flying"}
                    className="w-full"
                  >
                    {flightStatus === "planning" ? (
                      <>
                        <Settings className="w-4 h-4 mr-2 animate-spin" />
                        Generating Flight Plan...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Generate Flight Plan
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={simulateFlightExecution}
                    disabled={flightStatus === "flying" || flightStatus === "planning"}
                    className="w-full bg-green-700 hover:bg-green-800"
                  >
                    {flightStatus === "flying" ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Flight in Progress...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Execute Flight
                      </>
                    )}
                  </Button>

                  {flightStatus === "completed" && (
                    <div className="bg-green-50 p-3 rounded text-sm">
                      <div className="flex items-center text-green-800">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span className="font-medium">Flight Completed!</span>
                      </div>
                      <div className="mt-1 text-green-700">
                        Plants detected: <span className="font-bold">{plantCount}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Plants</p>
                    <p className="text-2xl font-bold text-green-700">2,847</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-700" />
                </div>
                <p className="text-xs text-gray-500 mt-2">+12% from last survey</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Surveys This Month</p>
                    <p className="text-2xl font-bold text-blue-600">8</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">3 plots covered</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Flight Hours</p>
                    <p className="text-2xl font-bold text-purple-600">24.5</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Accuracy Rate</p>
                    <p className="text-2xl font-bold text-orange-600">99.5%</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Plant detection</p>
              </CardContent>
            </Card>
          </div>

          {/* Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Plant Growth Trends</CardTitle>
              <CardDescription>Track plant count changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Growth analytics chart</p>
                  <p className="text-sm text-gray-500">Interactive charts showing plant count trends</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plot Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Plot Performance</CardTitle>
              <CardDescription>Individual plot statistics and health metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedPlots.map((plot) => (
                  <div key={plot.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{plot.name}</h4>
                      <p className="text-sm text-gray-600">
                        {plot.plantType} • {plot.area}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-700">{Math.floor(Math.random() * 500) + 200} plants</p>
                      <p className="text-xs text-gray-500">Last: {plot.lastFlown}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule New Flight</CardTitle>
                <CardDescription>Set up recurring surveys for your plots</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Plot</label>
                  <select className="w-full border rounded p-2">
                    <option>Choose a plot...</option>
                    {savedPlots.map((plot) => (
                      <option key={plot.id} value={plot.id}>
                        {plot.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Frequency</label>
                    <select className="w-full border rounded p-2">
                      <option>Weekly</option>
                      <option>Bi-weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <Input type="date" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Time</label>
                  <Input type="time" defaultValue="09:00" />
                </div>

                <Button className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Flight
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Flights</CardTitle>
                <CardDescription>Your scheduled survey missions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">North Field A</p>
                      <p className="text-sm text-gray-600">Tomorrow at 9:00 AM</p>
                    </div>
                    <Badge>Scheduled</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Greenhouse Block B</p>
                      <p className="text-sm text-gray-600">Jan 20 at 10:30 AM</p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">South Nursery</p>
                      <p className="text-sm text-gray-600">Jan 25 at 2:00 PM</p>
                    </div>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flight History</CardTitle>
              <CardDescription>Review past surveys and download reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: "2024-01-15", plot: "North Field A", plants: 1247, duration: "12 min", status: "completed" },
                  {
                    date: "2024-01-12",
                    plot: "Greenhouse Block B",
                    plants: 892,
                    duration: "8 min",
                    status: "completed",
                  },
                  { date: "2024-01-10", plot: "South Nursery", plants: 1508, duration: "15 min", status: "completed" },
                  { date: "2024-01-08", plot: "North Field A", plants: 1198, duration: "11 min", status: "completed" },
                ].map((flight, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{flight.plot}</p>
                        <p className="text-sm text-gray-600">
                          {flight.date} • {flight.duration}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{flight.plants} plants</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {flight.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
