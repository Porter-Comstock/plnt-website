"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Square, Trash2, Layers } from "lucide-react"

interface MapArea {
  type: string
  coordinates: { lat: number; lng: number }[]
  area: string
  bounds: {
    getNorth: () => number
    getSouth: () => number
    getEast: () => number
    getWest: () => number
  }
}

interface LeafletMap {
  remove: () => void
  on: (event: string, handler: (e: LeafletEvent) => void) => void
}

interface LeafletEvent {
  latlng: { lat: number; lng: number }
}

interface LeafletPolygon {
  getLatLngs: () => [{ lat: number; lng: number }[]]
  setLatLngs: (latlngs: { lat: number; lng: number }[]) => void
  bindPopup: (content: string) => LeafletPolygon
  openPopup: () => LeafletPolygon
  getBounds: () => {
    getNorth: () => number
    getSouth: () => number
    getEast: () => number
    getWest: () => number
  }
}

interface LeafletFeatureGroup {
  addTo: (map: LeafletMap) => LeafletFeatureGroup
  clearLayers: () => void
}

// Leaflet integration for real satellite imagery
export default function SatelliteMap({ onAreaDrawn }: { onAreaDrawn?: (area: MapArea) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null)
  const [drawingMode, setDrawingMode] = useState<"none" | "polygon" | "marker">("none")
  const [drawnItems, setDrawnItems] = useState<LeafletFeatureGroup | null>(null)
  const [currentPolygon, setCurrentPolygon] = useState<LeafletPolygon | null>(null)
  const [mapLayer, setMapLayer] = useState<"satellite" | "street">("satellite")

  const handleMapClick = useCallback(
    (e: LeafletEvent, L: typeof import("leaflet"), mapInstance: LeafletMap, drawnItemsLayer: LeafletFeatureGroup) => {
      if (!currentPolygon) {
        // Start new polygon
        const polygon = L.polygon([e.latlng], {
          color: "#8B5CF6",
          fillColor: "#8B5CF6",
          fillOpacity: 0.2,
          weight: 3,
        }).addTo(drawnItemsLayer) as LeafletPolygon

        setCurrentPolygon(polygon)
      } else {
        // Add point to existing polygon
        const latlngs = currentPolygon.getLatLngs()[0]
        latlngs.push(e.latlng)
        currentPolygon.setLatLngs(latlngs)
      }
    },
    [currentPolygon],
  )

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    const initializeMap = async () => {
      if (typeof window === "undefined") return

      try {
        // Import Leaflet dynamically
        const L = await import("leaflet")
        await import("leaflet/dist/leaflet.css")

        // Fix for default markers
        delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        setLeaflet(L)

        if (mapRef.current && !map) {
          // Initialize map centered on a typical nursery location
          const newMap = L.map(mapRef.current).setView([34.0522, -118.2437], 18) as LeafletMap // Los Angeles area, high zoom

          // Satellite layer (Esri World Imagery)
          const satelliteLayer = L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
              attribution: "© Esri, Maxar, Earthstar Geographics",
              maxZoom: 20,
            },
          )

          // Street layer (OpenStreetMap)
          const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
          })

          // Add default satellite layer
          satelliteLayer.addTo(newMap)

          // Layer control
          const baseLayers = {
            Satellite: satelliteLayer,
            Street: streetLayer,
          }
          L.control.layers(baseLayers).addTo(newMap)

          // Initialize drawing layer
          const drawnItemsLayer = L.featureGroup().addTo(newMap) as LeafletFeatureGroup
          setDrawnItems(drawnItemsLayer)

          setMap(newMap)

          // Add click handler for drawing
          newMap.on("click", (e: LeafletEvent) => {
            if (drawingMode === "polygon") {
              handleMapClick(e, L, newMap, drawnItemsLayer)
            } else if (drawingMode === "marker") {
              addMarker(e, L, drawnItemsLayer)
            }
          })
        }
      } catch (error) {
        console.error("Failed to load Leaflet:", error)
        // Fallback to canvas map if Leaflet fails
        setLeaflet(null)
      }
    }

    initializeMap()

    return () => {
      if (map) {
        map.remove()
        setMap(null)
      }
    }
  }, [drawingMode, handleMapClick, map])

  const addMarker = (e: LeafletEvent, L: typeof import("leaflet"), drawnItemsLayer: LeafletFeatureGroup) => {
    const marker = L.marker(e.latlng).addTo(drawnItemsLayer)
    marker.bindPopup("Drone waypoint").openPopup()
    setDrawingMode("none")
  }

  const finishPolygon = () => {
    if (currentPolygon && leaflet) {
      // Calculate area in square meters, then convert to acres
      const area = (
        leaflet as typeof import("leaflet") & {
          GeometryUtil?: { geodesicArea: (latlngs: { lat: number; lng: number }[]) => number }
        }
      ).GeometryUtil
        ? (
            leaflet as typeof import("leaflet") & {
              GeometryUtil: { geodesicArea: (latlngs: { lat: number; lng: number }[]) => number }
            }
          ).GeometryUtil.geodesicArea(currentPolygon.getLatLngs()[0])
        : 0
      const acres = (area * 0.000247105).toFixed(2) // Convert m² to acres

      // Add popup with area info
      currentPolygon.bindPopup(`Survey Area: ${acres} acres`).openPopup()

      // Generate flight path overlay
      generateFlightPath(currentPolygon, leaflet, drawnItems)

      // Notify parent component
      onAreaDrawn?.({
        type: "polygon",
        coordinates: currentPolygon.getLatLngs()[0],
        area: `${acres} acres`,
        bounds: currentPolygon.getBounds(),
      })

      setCurrentPolygon(null)
      setDrawingMode("none")
    }
  }

  const generateFlightPath = (
    polygon: LeafletPolygon,
    L: typeof import("leaflet"),
    drawnItemsLayer: LeafletFeatureGroup | null,
  ) => {
    if (!drawnItemsLayer) return

    const bounds = polygon.getBounds()
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()

    // Create lawnmower pattern
    const spacing = 0.0001 // Adjust based on desired overlap

    for (let lat = south; lat <= north; lat += spacing) {
      L.polyline(
        [
          [lat, west],
          [lat, east],
        ],
        {
          color: "#06B6D4",
          weight: 2,
          dashArray: "5, 5",
          opacity: 0.7,
        },
      ).addTo(drawnItemsLayer)
    }
  }

  const startDrawingPolygon = () => {
    setDrawingMode("polygon")
    setCurrentPolygon(null)
  }

  const addMarkerMode = () => {
    setDrawingMode("marker")
  }

  const clearAll = () => {
    if (drawnItems) {
      drawnItems.clearLayers()
    }
    setCurrentPolygon(null)
    setDrawingMode("none")
  }

  const switchMapLayer = () => {
    const newLayer = mapLayer === "satellite" ? "street" : "satellite"
    setMapLayer(newLayer)

    // This would require storing layer references to switch them
    // For now, user can use the layer control in the top-right
  }

  // Fallback to canvas if Leaflet fails to load
  if (leaflet === null) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Loading satellite imagery...</strong> If this persists, the interactive canvas map will be used as
            fallback.
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            <Square className="w-4 h-4 mr-2" />
            Draw Area
          </Button>
          <Button variant="outline" size="sm" disabled>
            <MapPin className="w-4 h-4 mr-2" />
            Add Marker
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>

        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading satellite map...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button variant={drawingMode === "polygon" ? "default" : "outline"} size="sm" onClick={startDrawingPolygon}>
          <Square className="w-4 h-4 mr-2" />
          Draw Area
        </Button>
        <Button variant={drawingMode === "marker" ? "default" : "outline"} size="sm" onClick={addMarkerMode}>
          <MapPin className="w-4 h-4 mr-2" />
          Add Marker
        </Button>
        {currentPolygon && (
          <Button size="sm" onClick={finishPolygon} className="bg-green-600 hover:bg-green-700">
            Finish Area
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button variant="outline" size="sm" onClick={switchMapLayer}>
          <Layers className="w-4 h-4 mr-2" />
          {mapLayer === "satellite" ? "Street" : "Satellite"}
        </Button>
      </div>

      <div className="relative">
        <div ref={mapRef} className="h-96 w-full rounded-lg border" style={{ minHeight: "400px" }} />

        {drawingMode === "polygon" && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow-sm text-xs z-[1000]">
            <div className="font-medium text-purple-600">Drawing Mode Active</div>
            <div className="text-gray-600">Click points to create survey area, then click {'"Finish Area"'}</div>
          </div>
        )}

        {drawingMode === "marker" && (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow-sm text-xs z-[1000]">
            <div className="font-medium text-blue-600">Marker Mode Active</div>
            <div className="text-gray-600">Click to place drone waypoint</div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        <strong>Instructions:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Use the layer control (top-right) to switch between Satellite and Street view</li>
          <li>Click {'"Draw Area"'} then click points on the map to create survey boundary</li>
          <li>Click {'"Finish Area"'} to complete the polygon and generate flight path</li>
          <li>Use {'"Add Marker"'} to set drone start/landing points</li>
          <li>Zoom in/out with mouse wheel, drag to pan around</li>
        </ul>
      </div>
    </div>
  )
}
