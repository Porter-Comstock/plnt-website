// components/flight-path-preview-map.tsx
'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface FlightPathPreviewMapProps {
  waypoints: {
    coordinates: [number, number][]
    type: string
  }
  plotName?: string
  zoomLevel?: number  // Allow customizing zoom level
  autoFit?: boolean   // Whether to auto-fit bounds or use fixed zoom
}

export default function FlightPathPreviewMap({ 
  waypoints, 
  plotName,
  zoomLevel = 20,  // Default to 17 for better overview
  autoFit = false   // Default to fixed zoom, not auto-fit
}: FlightPathPreviewMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debug logging
  console.log('FlightPathPreviewMap render - zoomLevel:', zoomLevel, 'autoFit:', autoFit)

  useEffect(() => {
    // Clear any existing initialization timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current)
      initTimeoutRef.current = null
    }

    // Ensure we have valid waypoints
    if (!waypoints?.coordinates || waypoints.coordinates.length === 0) {
      console.log('No waypoints provided to flight path preview map')
      return
    }

    // Clean up any existing map
    if (mapRef.current) {
      try {
        mapRef.current.remove()
      } catch (error) {
        console.error('Error removing existing map:', error)
      }
      mapRef.current = null
    }

    // Check if container exists
    const container = mapContainerRef.current
    if (!container) {
      console.log('Map container not found')
      return
    }

    // Small delay to ensure DOM is ready
    initTimeoutRef.current = setTimeout(() => {
      try {
        // Calculate center and bounds from waypoints
        const lats = waypoints.coordinates.map(coord => coord[1])
        const lngs = waypoints.coordinates.map(coord => coord[0])
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
        
        // Create bounds for proper fitting
        const bounds = L.latLngBounds(
          waypoints.coordinates.map(coord => [coord[1], coord[0]] as [number, number])
        )

        // Initialize map with a try-catch for safety
        let map: L.Map | null = null
        try {
          map = L.map(container, {
            center: [centerLat, centerLng],
            zoom: zoomLevel,
            zoomControl: true,
            attributionControl: false,
          })
        } catch (mapError) {
          console.error('Error creating map instance:', mapError)
          return
        }

        if (!map) {
          console.error('Failed to create map instance')
          return
        }

        // Add satellite tile layer with labels (hybrid view)
        L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google',
          maxZoom: 20,
          maxNativeZoom: 20,
        }).addTo(map)

        // Draw the main flight path
        const flightPath = L.polyline(
          waypoints.coordinates.map(coord => [coord[1], coord[0]] as [number, number]),
          {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.9,
            dashArray: '10, 5',
            className: 'animated-dash'
          }
        ).addTo(map)

        // Add waypoint markers (show fewer for clarity)
        waypoints.coordinates.forEach((coord, index) => {
          if (index % Math.ceil(waypoints.coordinates.length / 10) === 0 || 
              index === 0 || 
              index === waypoints.coordinates.length - 1) {
            
            let markerOptions = {}
            let popupText = ''
            
            if (index === 0) {
              // Start point
              const startIcon = L.divIcon({
                html: `
                  <div style="
                    background: #10b981;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                    border: 3px solid white;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                `,
                iconSize: [32, 32],
                className: 'start-marker',
              })
              markerOptions = { icon: startIcon }
              popupText = 'Start Point'
            } else if (index === waypoints.coordinates.length - 1) {
              // End point
              const endIcon = L.divIcon({
                html: `
                  <div style="
                    background: #ef4444;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                    border: 3px solid white;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                    </svg>
                  </div>
                `,
                iconSize: [32, 32],
                className: 'end-marker',
              })
              markerOptions = { icon: endIcon }
              popupText = 'End Point'
            } else {
              // Waypoint
              const waypointIcon = L.divIcon({
                html: `
                  <div style="
                    background: #3b82f6;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    border: 2px solid white;
                  ">${index}</div>
                `,
                iconSize: [20, 20],
                className: 'waypoint-marker',
              })
              markerOptions = { icon: waypointIcon }
              popupText = `Waypoint ${index}`
            }
            
            L.marker([coord[1], coord[0]], markerOptions)
              .bindPopup(popupText)
              .addTo(map)
          }
        })

        // Draw survey boundary (approximate from waypoints)
        if (waypoints.coordinates.length > 3) {
          // Create a convex hull or boundary from waypoints
          const boundaryPoints = createBoundaryFromWaypoints(waypoints.coordinates)
          if (boundaryPoints.length > 2) {
            L.polygon(
              boundaryPoints.map(coord => [coord[1], coord[0]] as [number, number]),
              {
                color: '#10b981',
                weight: 2,
                opacity: 0.8,
                fill: true,
                fillColor: '#10b981',
                fillOpacity: 0.1,
                dashArray: ''
              }
            ).addTo(map)
          }
        }

        // Store map reference before fitting bounds
        mapRef.current = map

        // Fit map to bounds with padding for better view
        // Use a longer delay and check if map still exists
        setTimeout(() => {
          // Check if map is still valid and not removed
          if (!mapRef.current || !map || !map.getContainer()) {
            console.log('Map no longer valid, skipping fitBounds')
            return
          }

          if (autoFit && bounds && bounds.isValid()) {
            // Auto-fit mode: fit to bounds
            try {
              map.fitBounds(bounds, { 
                padding: [50, 50],
                maxZoom: zoomLevel  // Don't zoom in past the specified level
              })
            } catch (error) {
              console.error('Error fitting bounds:', error)
              // Fallback to center view
              if (mapRef.current && waypoints.coordinates.length > 0) {
                try {
                  const firstWaypoint = waypoints.coordinates[0]
                  if (firstWaypoint && firstWaypoint.length === 2) {
                    map.setView([firstWaypoint[1], firstWaypoint[0]], zoomLevel)
                  }
                } catch (setViewError) {
                  console.error('Error setting view:', setViewError)
                }
              }
            }
          } else {
            // Fixed zoom mode: just center on the waypoints at specified zoom
            try {
              console.log('Setting fixed zoom to:', zoomLevel, 'at center:', centerLat, centerLng)
              map.setView([centerLat, centerLng], zoomLevel)
              
              // Verify the zoom was applied
              setTimeout(() => {
                if (map && map.getContainer()) {
                  const actualZoom = map.getZoom()
                  console.log('Actual zoom after setView:', actualZoom)
                  if (actualZoom !== zoomLevel) {
                    console.log('Zoom mismatch! Trying to set again...')
                    map.setZoom(zoomLevel)
                  }
                }
              }, 100)
            } catch (error) {
              console.error('Error setting fixed zoom view:', error)
            }
          }
        }, 300) // Increased delay to 300ms for better stability

        // Add scale control
        L.control.scale({
          position: 'bottomleft',
          metric: true,
          imperial: true,
        }).addTo(map)

        // Add legend
        const legend = new L.Control({ position: 'bottomright' })
        legend.onAdd = function() {
          const div = L.DomUtil.create('div', 'info legend')
          div.style.background = 'white'
          div.style.padding = '10px'
          div.style.borderRadius = '5px'
          div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
          div.innerHTML = `
            <div style="font-size: 12px;">
              <div style="margin-bottom: 5px;"><strong>${plotName || 'Survey Area'}</strong></div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 20px; height: 2px; background: #10b981; margin-right: 5px;"></div>
                <span>Boundary</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 20px; height: 2px; background: #3b82f6; border-bottom: 2px dashed #3b82f6; margin-right: 5px;"></div>
                <span>Flight Path</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 10px; height: 10px; background: #10b981; border-radius: 50%; margin-right: 5px;"></div>
                <span>Start</span>
                <div style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%; margin-left: 10px; margin-right: 5px;"></div>
                <span>End</span>
              </div>
            </div>
          `
          return div
        }
        legend.addTo(map)

      } catch (error) {
        console.error('Error initializing flight preview map:', error)
      }
    }, 100) // Small initial delay

    // Cleanup function
    return () => {
      // Clear timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
        initTimeoutRef.current = null
      }
      
      // Clean up map
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (error) {
          console.error('Error cleaning up map:', error)
        }
        mapRef.current = null
      }
    }
  }, [waypoints, plotName, zoomLevel])

  // Helper function to create boundary from waypoints
  const createBoundaryFromWaypoints = (coords: [number, number][]) => {
    if (coords.length < 4) return coords
    
    // Simple approach: take the outer points
    const lngs = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    
    // Create rectangle boundary
    return [
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ] as [number, number][]
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
      
      <style jsx global>{`
        .animated-dash {
          animation: dash-animation 20s linear infinite;
        }
        
        @keyframes dash-animation {
          to {
            stroke-dashoffset: -100;
          }
        }
        
        .start-marker {
          z-index: 1000 !important;
        }
        
        .end-marker {
          z-index: 999 !important;
        }
        
        .waypoint-marker {
          z-index: 998 !important;
        }
        
        .info.legend {
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  )
}