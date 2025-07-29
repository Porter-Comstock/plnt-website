// components/enhanced-satellite-map.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { MapPin, Search, Plane, Trash2, Navigation, Layers, Maximize2 } from 'lucide-react'

// Using Plane icon as Drone
const Drone = Plane

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapArea {
  id: number
  points: { x: number; y: number; lat: number; lng: number }[]
  area: string
  coordinates: { lat: number; lng: number }[]
}

interface EnhancedSatelliteMapProps {
  onAreaDrawn?: (area: MapArea) => void
  defaultCenter?: [number, number]
  defaultZoom?: number
  existingBoundary?: { lat: number; lng: number }[] // Add this new prop
}

export default function EnhancedSatelliteMap({ 
  onAreaDrawn, 
  defaultCenter = [34.0522, -118.2437],
  defaultZoom = 18,
  existingBoundary // Add this
}: EnhancedSatelliteMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const flightPathLayerRef = useRef<L.LayerGroup | null>(null)
  const [searchAddress, setSearchAddress] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentArea, setCurrentArea] = useState<MapArea | null>(null)
  const [mapStyle, setMapStyle] = useState<'satellite' | 'hybrid'>('hybrid')

  useEffect(() => {
    if (!mapRef.current) {
      // Initialize map with better options
      const map = L.map('enhanced-satellite-map', {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false,
        attributionControl: false,
      })

      // Add custom zoom control
      L.control.zoom({
        position: 'topright'
      }).addTo(map)

      // Add attribution in bottom right
      L.control.attribution({
        position: 'bottomright'
      }).addTo(map)

      // Create tile layers with better quality
      const satelliteLayers = {
        'ESRI Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri',
          maxZoom: 20,
          maxNativeZoom: 19,
        }),
        'ESRI Hybrid': L.layerGroup([
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri',
            maxZoom: 20,
            maxNativeZoom: 19,
          }),
          L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 20,
            opacity: 0.8,
          })
        ]),
        'Mapbox Satellite': L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
          attribution: '&copy; Mapbox',
          tileSize: 512,
          maxZoom: 20,
          zoomOffset: -1,
        }),
      }

      // Use hybrid view by default for better visibility
      satelliteLayers['ESRI Hybrid'].addTo(map)

      // Create feature groups
      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      drawnItemsRef.current = drawnItems

      const flightPathLayer = new L.LayerGroup()
      map.addLayer(flightPathLayer)
      flightPathLayerRef.current = flightPathLayer

      mapRef.current = map

      // Load Leaflet Draw
      import('leaflet-draw').then(() => {
        // Wait for next tick to ensure map is fully initialized
        setTimeout(() => {
          // Ensure L.Draw is available and map still exists
          if (!(L as any).Draw || !mapRef.current) {
            console.error('Leaflet Draw not properly loaded or map destroyed')
            return
          }

          try {
            const L_Draw = (L as any).Control.Draw
            const L_Draw_Event = (L as any).Draw.Event
            
            // Create a simpler drawing control with just polygon
            const drawControl = new L_Draw({
              position: 'topleft',
              draw: {
                polygon: {
                  allowIntersection: false,
                  drawError: {
                    color: '#ef4444',
                    message: '<strong>Error:</strong> Edges cannot cross!',
                  },
                  shapeOptions: {
                    color: '#10b981',
                    weight: 3,
                    opacity: 0.9,
                    fill: true,
                    fillColor: '#10b981',
                    fillOpacity: 0.15,
                  },
                },
                polyline: false,
                circle: false,
                rectangle: false,
                marker: false,
                circlemarker: false,
              },
              edit: {
                featureGroup: drawnItems,
                remove: true,
                edit: false,
              },
            })
            
            // Add control to map
            mapRef.current.addControl(drawControl)
            
            // Override the default delete button behavior
            setTimeout(() => {
              const deleteButton = document.querySelector('.leaflet-draw-edit-remove') as HTMLElement
              if (deleteButton) {
                // Remove any existing click handlers
                const newDeleteButton = deleteButton.cloneNode(true) as HTMLElement
                deleteButton.parentNode?.replaceChild(newDeleteButton, deleteButton)
                
                // Add our custom handler
                newDeleteButton.addEventListener('click', function(e) {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  // Check if there are any drawn items
                  if (drawnItems.getLayers().length > 0) {
                    // Just clear without confirmation for cleaner UX
                    drawnItems.clearLayers()
                    flightPathLayerRef.current?.clearLayers()
                    setCurrentArea(null)
                    if (onAreaDrawn) {
                      onAreaDrawn(null as any)
                    }
                  }
                })
              }
            }, 200)

            // Handle drawing events
            mapRef.current.on(L_Draw_Event.CREATED, (e: any) => {
              const layer = e.layer
              
              // Clear previous drawings
              drawnItems.clearLayers()
              flightPathLayerRef.current?.clearLayers()
              
              // Add the new layer
              drawnItems.addLayer(layer)

              // Get coordinates based on shape type
              let latLngs: L.LatLng[]
              if (e.layerType === 'rectangle') {
                const bounds = layer.getBounds()
                latLngs = [
                  bounds.getNorthWest(),
                  bounds.getNorthEast(),
                  bounds.getSouthEast(),
                  bounds.getSouthWest()
                ]
              } else {
                latLngs = layer.getLatLngs()[0]
              }

              // Calculate area and generate flight path
              const area = calculateArea(latLngs)
              const flightPath = generateOptimizedFlightPath(latLngs)

              const mapArea: MapArea = {
                id: Date.now(),
                points: latLngs.map((ll: L.LatLng) => ({
                  x: ll.lng,
                  y: ll.lat,
                  lat: ll.lat,
                  lng: ll.lng,
                })),
                area: `${area.toFixed(2)} acres`,
                coordinates: flightPath,
              }

              setCurrentArea(mapArea)
              if (onAreaDrawn) {
                onAreaDrawn(mapArea)
              }

              // Draw flight path with high quality
              if (flightPathLayerRef.current) {
                drawHighQualityFlightPath(mapRef.current!, flightPathLayerRef.current, flightPath, latLngs)
              }
            })

            // Don't need the DELETED event handler since we're handling it manually
            mapRef.current.on(L_Draw_Event.DELETED, () => {
              // This won't fire because we're overriding the delete button
            })

            mapRef.current.on(L_Draw_Event.EDITED, (e: any) => {
              const layers = e.layers
              layers.eachLayer((layer: any) => {
                const latLngs = layer.getLatLngs()[0]
                const area = calculateArea(latLngs)
                const flightPath = generateOptimizedFlightPath(latLngs)

                const mapArea: MapArea = {
                  id: Date.now(),
                  points: latLngs.map((ll: L.LatLng) => ({
                    x: ll.lng,
                    y: ll.lat,
                    lat: ll.lat,
                    lng: ll.lng,
                  })),
                  area: `${area.toFixed(2)} acres`,
                  coordinates: flightPath,
                }

                setCurrentArea(mapArea)
                if (onAreaDrawn) {
                  onAreaDrawn(mapArea)
                }

                if (flightPathLayerRef.current) {
                  flightPathLayerRef.current.clearLayers()
                  drawHighQualityFlightPath(mapRef.current!, flightPathLayerRef.current, flightPath, latLngs)
                }
              })
            })
          } catch (error) {
            console.error('Error initializing draw controls:', error)
          }
        }, 100)
      })
      
      // Add scale control
      L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: true,
      }).addTo(map)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (mapRef.current && existingBoundary && existingBoundary.length > 0) {
      // Clear any existing drawn items first
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers()
      }
      if (flightPathLayerRef.current) {
        flightPathLayerRef.current.clearLayers()
      }

      // Create a polygon from the existing boundary
      const polygon = L.polygon(
        existingBoundary.map(coord => [coord.lat, coord.lng]),
        {
          color: '#10b981',
          weight: 3,
          opacity: 0.9,
          fill: true,
          fillColor: '#10b981',
          fillOpacity: 0.15,
        }
      )

      // Add to drawn items
      if (drawnItemsRef.current) {
        drawnItemsRef.current.addLayer(polygon)
      }

      // Calculate area and generate flight path
      const latLngs = existingBoundary.map(coord => L.latLng(coord.lat, coord.lng))
      const area = calculateArea(latLngs)
      const flightPath = generateOptimizedFlightPath(latLngs)

      const mapArea: MapArea = {
        id: Date.now(),
        points: existingBoundary.map((coord) => ({
          x: coord.lng,
          y: coord.lat,
          lat: coord.lat,
          lng: coord.lng,
        })),
        area: `${area.toFixed(2)} acres`,
        coordinates: flightPath,
      }

      setCurrentArea(mapArea)
      
      // Draw the flight path
      if (flightPathLayerRef.current && mapRef.current) {
        drawHighQualityFlightPath(
          mapRef.current, 
          flightPathLayerRef.current, 
          flightPath, 
          latLngs
        )
      }

      // Center the map on the boundary
      try {
        const bounds = L.latLngBounds(existingBoundary.map(coord => [coord.lat, coord.lng]))
        mapRef.current.fitBounds(bounds, { padding: [50, 50] })
      } catch (error) {
        console.error('Error fitting bounds to existing boundary:', error)
      }

      // Call the callback if provided
      if (onAreaDrawn) {
        onAreaDrawn(mapArea)
      }
    }
  }, [existingBoundary, onAreaDrawn])

  const calculateArea = (latLngs: L.LatLng[]): number => {
    let area = 0
    const numPoints = latLngs.length

    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints
      const lat1 = latLngs[i].lat * Math.PI / 180
      const lat2 = latLngs[j].lat * Math.PI / 180
      const lng1 = latLngs[i].lng * Math.PI / 180
      const lng2 = latLngs[j].lng * Math.PI / 180

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }

    area = Math.abs(area * 6378137 * 6378137 / 2)
    return area / 4046.86 // Convert to acres
  }

  const generateOptimizedFlightPath = (boundary: L.LatLng[]): { lat: number; lng: number }[] => {
    const bounds = L.latLngBounds(boundary)
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()

    // Calculate optimal line spacing based on camera FOV and overlap
    const altitude = 30 // meters
    const cameraFOV = 84 // degrees (typical for DJI drones)
    const overlap = 0.8 // 80% overlap
    
    // Calculate ground coverage width
    const coverageWidth = 2 * altitude * Math.tan((cameraFOV / 2) * Math.PI / 180)
    const lineSpacing = coverageWidth * (1 - overlap)
    
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

    // Add entry and exit points
    if (flightPath.length > 0) {
      const entryPoint = { lat: south - lineSpacingDeg, lng: west }
      const exitPoint = { lat: flightPath[flightPath.length - 1].lat, lng: flightPath[flightPath.length - 1].lng }
      flightPath.unshift(entryPoint)
      flightPath.push(exitPoint)
    }

    return flightPath
  }

  const drawHighQualityFlightPath = (
    map: L.Map, 
    layer: L.LayerGroup, 
    path: { lat: number; lng: number }[], 
    boundary: L.LatLng[]
  ) => {
    // Clear existing paths
    layer.clearLayers()

    // Draw boundary with glow effect
    const boundaryLine = L.polygon(boundary, {
      color: '#10b981',
      weight: 4,
      opacity: 1,
      fill: true,
      fillColor: '#10b981',
      fillOpacity: 0.1,
      className: 'survey-boundary'
    }).addTo(layer)

    // Draw flight path with smooth curves
    const smoothPath = L.polyline(
      path.map(p => [p.lat, p.lng]),
      {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.9,
        dashArray: '10, 5',
        className: 'flight-path'
      }
    ).addTo(layer)

    // Add waypoint markers with numbers
    path.forEach((point, index) => {
      if (index % 2 === 0 && index > 0 && index < path.length - 1) {
        const waypointIcon = L.divIcon({
          html: `<div class="waypoint-marker">${Math.floor(index/2) + 1}</div>`,
          iconSize: [20, 20],
          className: 'custom-waypoint',
        })
        L.marker([point.lat, point.lng], { icon: waypointIcon }).addTo(layer)
      }
    })

    // Add start point
    if (path.length > 0) {
      const startIcon = L.divIcon({
        html: `
          <div class="drone-start-marker">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        className: 'drone-start',
      })
      L.marker([path[0].lat, path[0].lng], { icon: startIcon }).addTo(layer)
    }

    // Add end point
    if (path.length > 1) {
      const endIcon = L.divIcon({
        html: `
          <div class="drone-end-marker">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12" y2="16"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        className: 'drone-end',
      })
      L.marker([path[path.length - 1].lat, path[path.length - 1].lng], { icon: endIcon }).addTo(layer)
    }
  }

  const searchLocation = async () => {
    if (!searchAddress) return

    try {
      // Try multiple geocoding services for better results
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`
      )
      const nominatimData = await nominatimResponse.json()

      if (nominatimData && nominatimData.length > 0) {
        const { lat, lon, display_name } = nominatimData[0]
        mapRef.current?.setView([parseFloat(lat), parseFloat(lon)], 18)
        
        // Add a temporary marker at the searched location
        const searchMarker = L.marker([parseFloat(lat), parseFloat(lon)])
          .addTo(mapRef.current!)
          .bindPopup(display_name)
          .openPopup()
        
        // Remove marker after 5 seconds
        setTimeout(() => {
          mapRef.current?.removeLayer(searchMarker)
        }, 5000)
      } else {
        alert('Location not found. Try being more specific (e.g., "123 Main St, City, State")')
      }
    } catch (error) {
      console.error('Error searching location:', error)
      alert('Error searching location. Please try again.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchLocation()
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          mapRef.current?.setView([latitude, longitude], 18)
          
          // Add current location marker
          const locationMarker = L.marker([latitude, longitude])
            .addTo(mapRef.current!)
            .bindPopup('Your current location')
            .openPopup()
        },
        (error) => {
          alert('Unable to get your location. Please enable location services.')
        }
      )
    }
  }

  return (
    <div className="relative">
      {/* Search Bar */}
      <Card className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] p-3 bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search any location globally..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-4 w-80"
            />
          </div>
          <Button onClick={searchLocation} size="sm" className="bg-green-700 hover:bg-green-800 text-white">
            Search
          </Button>
          <Button onClick={getCurrentLocation} size="sm" variant="outline" title="Use current location">
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Drawing Instructions - Below toolbar buttons */}
      <div className="help-button-container z-[1000] transition-all duration-300">
        <Card className={`p-3 bg-white/95 backdrop-blur-sm shadow-lg transition-all ${isDrawing ? 'w-64' : 'w-auto'}`}>
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-semibold flex items-center text-green-800">
              <MapPin className="w-4 h-4 mr-2" />
              {isDrawing ? 'Quick Start Guide' : 'Help'}
            </h4>
            <span className="ml-2 text-gray-500">{isDrawing ? '−' : '+'}</span>
          </button>
          {isDrawing && (
            <ol className="text-xs space-y-1 text-gray-700 mt-3">
              <li className="flex items-start">
                <span className="font-semibold mr-1">1.</span>
                Search or navigate to location
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-1">2.</span>
                Click polygon tool (⬟)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-1">3.</span>
                Draw survey boundary
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-1">4.</span>
                Flight path auto-generates
              </li>
            </ol>
          )}
          {currentArea && (
            <div className="mt-3 pt-3 border-t bg-green-50 -mx-3 px-3 pb-2">
              <p className="text-xs font-semibold text-green-800">Survey Ready!</p>
              <div className="text-xs text-green-700 mt-1">
                <p>Area: {currentArea.area}</p>
                <p>Waypoints: {currentArea.coordinates.length}</p>
                <p>Est. Time: ~{Math.ceil(currentArea.coordinates.length * 0.3)} min</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Map Controls */}
      <div className="absolute top-20 right-4 z-[1000] space-y-2">
        <Card className="p-2 bg-white/95 backdrop-blur-sm shadow-lg">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              if (mapRef.current) {
                const container = document.getElementById('enhanced-satellite-map')
                if (container) {
                  if (!document.fullscreenElement) {
                    container.requestFullscreen().catch(err => {
                      console.error('Error attempting to enable fullscreen:', err)
                    })
                  } else {
                    document.exitFullscreen()
                  }
                }
              }
            }}
            title="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </Card>
      </div>

      {/* Flight Pattern Legend - Smaller and Collapsible */}
      <Card className="absolute bottom-24 right-4 z-[1000] p-3 bg-white/95 backdrop-blur-sm shadow-lg max-w-xs">
        <h4 className="font-semibold mb-2 flex items-center text-blue-800 text-sm">
          <Drone className="w-4 h-4 mr-2" />
          Flight Pattern
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-6 h-0.5 bg-green-600 rounded mr-2"></div>
            <span>Boundary</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-0.5 bg-blue-600 border-dashed border-b mr-2"></div>
            <span>Flight path</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-600">
          <p>30m altitude | 80% overlap</p>
        </div>
      </Card>

      {/* Map Container */}
      <div id="enhanced-satellite-map" className="h-[700px] w-full rounded-lg shadow-2xl" />

      <style jsx global>{`
        /* Hide the second toolbar completely */
        .leaflet-draw:nth-of-type(2) {
          display: none !important;
        }
        
        /* Style the first toolbar */
        .leaflet-draw:first-of-type {
          display: block !important;
        }
        
        /* Style all buttons (hidden by default) */
        .leaflet-draw:first-of-type a {
          display: none !important;
          background-color: white !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 6px !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          margin: 0 0 8px 0 !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          background-image: none !important;
          text-align: center !important;
          font-size: 18px !important;
          color: #374151 !important;
          cursor: pointer !important;
        }
        
        /* Show only polygon and delete buttons from first toolbar */
        .leaflet-draw:first-of-type a.leaflet-draw-draw-polygon,
        .leaflet-draw:first-of-type a.leaflet-draw-edit-remove {
          display: block !important;
        }
        
        /* Add the icons */
        .leaflet-draw-draw-polygon:before {
          content: "⬟";
          color: #10b981;
          font-weight: bold;
          display: block;
        }
        
        .leaflet-draw-edit-remove:before {
          content: "🗑";
          font-size: 16px;
          display: block;
        }
        
        /* Hover effects */
        .leaflet-draw:first-of-type a:hover {
          background-color: #f3f4f6 !important;
          border-color: #10b981 !important;
          transform: scale(1.05);
          transition: all 0.2s ease;
        }
        
        /* Disabled state for delete button */
        .leaflet-draw-edit-remove.leaflet-disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        
        .leaflet-draw-edit-remove.leaflet-disabled:hover {
          transform: none !important;
          background-color: white !important;
        }
        
        /* Position help button below toolbar */
        .help-button-container {
          position: absolute !important;
          top: 140px !important;
          left: 10px !important;
        }
        
        /* Fullscreen styles */
        #enhanced-satellite-map:fullscreen {
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
        }
        
        /* Tooltip styling */
        .leaflet-draw-tooltip {
          background: rgba(0, 0, 0, 0.8) !important;
          border: none !important;
          border-radius: 4px !important;
          color: white !important;
          font-size: 12px !important;
          padding: 6px 10px !important;
        }
        
        .waypoint-marker {
          background-color: #3b82f6;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          border: 2px solid white;
        }
        
        .drone-start-marker {
          background-color: #10b981;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
          border: 3px solid white;
          animation: pulse 2s infinite;
        }
        
        .drone-end-marker {
          background-color: #ef4444;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
          border: 3px solid white;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .survey-boundary {
          filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.5));
        }
        
        .flight-path {
          filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.5));
        }
        
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
        }
        
        .leaflet-control-zoom a {
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 18px !important;
          font-weight: normal !important;
          color: #374151 !important;
          background: white !important;
          border: none !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: #f3f4f6 !important;
        }
        
        .leaflet-control-scale {
          background: rgba(255, 255, 255, 0.9) !important;
          border-radius: 4px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid #e5e7eb !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px !important;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  )
}