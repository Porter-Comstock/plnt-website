// components/flight-path-preview-map.tsx
'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface FlightPathPreviewMapProps {
  waypoints: {
    coordinates: [number, number][]
    type: string
  }
  plotName?: string
}

export default function FlightPathPreviewMap({ waypoints, plotName }: FlightPathPreviewMapProps) {
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    // Ensure we have valid waypoints
    if (!waypoints?.coordinates || waypoints.coordinates.length === 0) {
      console.log('No waypoints provided to flight path preview map')
      return
    }

    // Only initialize if we don't already have a map
    if (!mapRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        try {
          // Check if the container exists
          const container = document.getElementById('flight-path-preview-map')
          if (!container) return

          // Calculate center point from waypoints
          const lats = waypoints.coordinates.map(coord => coord[1])
          const lngs = waypoints.coordinates.map(coord => coord[0])
          const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
          const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2

          // Initialize map
          const map = L.map('flight-path-preview-map', {
            center: [centerLat, centerLng],
            zoom: 17,
            zoomControl: true,
            attributionControl: false,
          })

          // Add satellite tile layer
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri',
            maxZoom: 20,
            maxNativeZoom: 19,
          }).addTo(map)

          // Draw the flight path
          const flightPath = L.polyline(
            waypoints.coordinates.map(coord => [coord[1], coord[0]]),
            {
              color: '#3b82f6',
              weight: 3,
              opacity: 0.9,
              dashArray: '10, 5',
            }
          ).addTo(map)

          // Add waypoint markers
          waypoints.coordinates.forEach((coord, index) => {
            if (index % 2 === 0) { // Show every other waypoint to avoid clutter
              const waypointIcon = L.divIcon({
                html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); border: 2px solid white;">${Math.floor(index/2) + 1}</div>`,
                iconSize: [20, 20],
                className: 'custom-waypoint',
              })
              L.marker([coord[1], coord[0]], { icon: waypointIcon }).addTo(map)
            }
          })

          // Add start point
          const startIcon = L.divIcon({
            html: `
              <div style="background-color: #10b981; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3); border: 3px solid white;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            className: 'drone-start',
          })
          L.marker([waypoints.coordinates[0][1], waypoints.coordinates[0][0]], { icon: startIcon })
            .bindPopup('Start Point')
            .addTo(map)

          // Add end point
          const endIcon = L.divIcon({
            html: `
              <div style="background-color: #ef4444; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3); border: 3px solid white;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12" y2="16"/>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            className: 'drone-end',
          })
          const lastCoord = waypoints.coordinates[waypoints.coordinates.length - 1]
          L.marker([lastCoord[1], lastCoord[0]], { icon: endIcon })
            .bindPopup('End Point')
            .addTo(map)

          // Fit map to bounds with a slight delay
          setTimeout(() => {
            if (map && flightPath) {
              try {
                map.fitBounds(flightPath.getBounds().pad(0.1))
              } catch (e) {
                console.error('Error fitting bounds:', e)
              }
            }
          }, 100)

          // Add scale control
          L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: true,
          }).addTo(map)

          mapRef.current = map
        } catch (error) {
          console.error('Error initializing flight preview map:', error)
        }
      }, 100)

      return () => {
        clearTimeout(timer)
      }
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.off() // Remove all event listeners
          mapRef.current.remove()
          mapRef.current = null
        } catch (error) {
          console.error('Error cleaning up map:', error)
        }
      }
    }
  }, [waypoints])

  return (
    <div className="relative">
      <div id="flight-path-preview-map" className="h-[400px] w-full rounded-lg shadow-inner" />
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <h4 className="text-xs font-semibold mb-2">Flight Pattern</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-blue-600 border-dashed border-b mr-2"></div>
            <span>Flight path</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
            <span>Start</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
            <span>End</span>
          </div>
        </div>
      </div>
    </div>
  )
}