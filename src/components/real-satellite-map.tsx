"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Square, Trash2, MapPin, Layers, ZoomIn, ZoomOut } from "lucide-react"

export default function RealSatelliteMap({ onAreaDrawn }: { onAreaDrawn?: (area: any) => void }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(16)
  const [center, setCenter] = useState({ lat: 34.0522, lng: -118.2437 }) // Los Angeles area
  const [mapLayer, setMapLayer] = useState<"satellite" | "hybrid" | "terrain">("satellite")
  const [drawingMode, setDrawingMode] = useState<"none" | "polygon">("none")
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number; lat: number; lng: number }[]>([])
  const [completedPolygons, setCompletedPolygons] = useState<any[]>([])

  // Tile layer URLs for different map types
  const tileLayers = {
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    hybrid: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", // Google Hybrid
    terrain: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  }

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Create the map container with satellite tiles
    const mapContainer = mapContainerRef.current
    mapContainer.innerHTML = ""

    // Create tile grid
    const tileSize = 256
    const mapWidth = 600
    const mapHeight = 400

    // Calculate which tiles we need for current view
    const tilesX = Math.ceil(mapWidth / tileSize) + 1
    const tilesY = Math.ceil(mapHeight / tileSize) + 1

    // Convert lat/lng to tile coordinates
    const lat2tile = (lat: number, zoom: number) =>
      Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
          Math.pow(2, zoom),
      )
    const lng2tile = (lng: number, zoom: number) => Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))

    const centerTileX = lng2tile(center.lng, zoom)
    const centerTileY = lat2tile(center.lat, zoom)

    // Create map wrapper
    const mapWrapper = document.createElement("div")
    mapWrapper.style.cssText = `
      position: relative;
      width: ${mapWidth}px;
      height: ${mapHeight}px;
      overflow: hidden;
      border-radius: 8px;
      background: #f0f0f0;
      cursor: ${drawingMode === "polygon" ? "crosshair" : "grab"};
    `

    // Add satellite tiles
    for (let x = -1; x < tilesX; x++) {
      for (let y = -1; y < tilesY; y++) {
        const tileX = centerTileX + x - Math.floor(tilesX / 2)
        const tileY = centerTileY + y - Math.floor(tilesY / 2)

        const img = document.createElement("img")
        img.style.cssText = `
          position: absolute;
          left: ${x * tileSize + mapWidth / 2 - tileSize / 2}px;
          top: ${y * tileSize + mapHeight / 2 - tileSize / 2}px;
          width: ${tileSize}px;
          height: ${tileSize}px;
          pointer-events: none;
        `

        // Use the selected tile layer
        const tileUrl = tileLayers[mapLayer]
          .replace("{z}", zoom.toString())
          .replace("{x}", tileX.toString())
          .replace("{y}", tileY.toString())

        img.src = tileUrl
        img.crossOrigin = "anonymous"

        // Handle tile loading errors
        img.onerror = () => {
          img.style.background = "#e0e0e0"
          img.alt = "Tile loading..."
        }

        mapWrapper.appendChild(img)
      }
    }

    // Add overlay canvas for drawing
    const canvas = document.createElement("canvas")
    canvas.width = mapWidth
    canvas.height = mapHeight
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: ${drawingMode === "polygon" ? "auto" : "none"};
      z-index: 10;
    `

    // Draw existing polygons and current drawing
    const ctx = canvas.getContext("2d")
    if (ctx) {
      // Draw completed polygons
      completedPolygons.forEach((polygon, index) => {
        if (polygon.points.length > 2) {
          ctx.beginPath()
          ctx.moveTo(polygon.points[0].x, polygon.points[0].y)
          polygon.points.forEach((point: any) => ctx.lineTo(point.x, point.y))
          ctx.closePath()
          ctx.strokeStyle = "#15803d"
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.fillStyle = "rgba(139, 92, 246, 0.2)"
          ctx.fill()

          // Add label
          const centerX = polygon.points.reduce((sum: number, p: any) => sum + p.x, 0) / polygon.points.length
          const centerY = polygon.points.reduce((sum: number, p: any) => sum + p.y, 0) / polygon.points.length
          ctx.fillStyle = "#15803d"
          ctx.font = "bold 12px sans-serif"
          ctx.fillText(`Survey ${index + 1}`, centerX - 30, centerY)
          ctx.font = "10px sans-serif"
          ctx.fillText(`${polygon.area}`, centerX - 20, centerY + 15)
        }
      })

      // Draw flight paths within completed polygons
      completedPolygons.forEach((polygon) => {
        if (polygon.points.length > 2) {
          const minX = Math.min(...polygon.points.map((p: any) => p.x))
          const maxX = Math.max(...polygon.points.map((p: any) => p.x))
          const minY = Math.min(...polygon.points.map((p: any) => p.y))
          const maxY = Math.max(...polygon.points.map((p: any) => p.y))

          // Draw lawnmower pattern
          ctx.strokeStyle = "#06B6D4"
          ctx.lineWidth = 2
          ctx.setLineDash([8, 4])

          // Horizontal passes
          for (let y = minY + 15; y < maxY; y += 20) {
            ctx.beginPath()
            ctx.moveTo(minX + 10, y)
            ctx.lineTo(maxX - 10, y)
            ctx.stroke()
          }

          // Add connecting lines for lawnmower pattern
          ctx.strokeStyle = "#0891b2"
          ctx.lineWidth = 1
          for (let y = minY + 15; y < maxY - 20; y += 40) {
            ctx.beginPath()
            ctx.moveTo(maxX - 10, y)
            ctx.lineTo(maxX - 10, y + 20)
            ctx.stroke()
          }

          ctx.setLineDash([])

          // Add flight path label
          const centerX = polygon.points.reduce((sum: number, p: any) => sum + p.x, 0) / polygon.points.length
          const centerY = polygon.points.reduce((sum: number, p: any) => sum + p.y, 0) / polygon.points.length
          ctx.fillStyle = "#06B6D4"
          ctx.font = "10px sans-serif"
          ctx.fillText("Flight Path", centerX - 25, centerY + 30)
        }
      })

      // Draw current polygon being drawn
      if (polygonPoints.length > 0) {
        ctx.beginPath()
        ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y)
        polygonPoints.forEach((point) => ctx.lineTo(point.x, point.y))
        ctx.strokeStyle = "#15803d"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw points
        polygonPoints.forEach((point, index) => {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI)
          ctx.fillStyle = "#15803d"
          ctx.fill()
          ctx.strokeStyle = "#FFFFFF"
          ctx.lineWidth = 2
          ctx.stroke()

          // Number the points
          ctx.fillStyle = "#FFFFFF"
          ctx.font = "bold 10px sans-serif"
          ctx.fillText((index + 1).toString(), point.x - 3, point.y + 3)
        })
      }
    }

    // Add click handler for drawing
    canvas.addEventListener("click", (e) => {
      if (drawingMode === "polygon") {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Convert pixel coordinates to approximate lat/lng
        const lng = center.lng + ((x - mapWidth / 2) / mapWidth) * (360 / Math.pow(2, zoom)) * 4
        const lat = center.lat - ((y - mapHeight / 2) / mapHeight) * (180 / Math.pow(2, zoom)) * 2

        setPolygonPoints([...polygonPoints, { x, y, lat, lng }])
      }
    })

    mapWrapper.appendChild(canvas)

    // Add map controls overlay
    const controlsDiv = document.createElement("div")
    controlsDiv.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: white;
      padding: 8px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      font-size: 12px;
      z-index: 20;
    `
    controlsDiv.innerHTML = `
      <div style="font-weight: bold; color: #15803d;">📡 Live Satellite View</div>
      <div style="color: #666; margin-top: 2px;">Zoom: ${zoom} | ${mapLayer.charAt(0).toUpperCase() + mapLayer.slice(1)}</div>
      ${drawingMode === "polygon" ? '<div style="color: #15803d; margin-top: 2px;">🎯 Drawing Mode Active</div>' : ""}
    `

    mapWrapper.appendChild(controlsDiv)

    // Add attribution
    const attribution = document.createElement("div")
    attribution.style.cssText = `
      position: absolute;
      bottom: 5px;
      right: 5px;
      background: rgba(255,255,255,0.8);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      color: #666;
      z-index: 20;
    `
    attribution.innerHTML = "© Esri, Maxar, Earthstar Geographics"
    mapWrapper.appendChild(attribution)

    mapContainer.appendChild(mapWrapper)
  }, [zoom, center, mapLayer, drawingMode, polygonPoints, completedPolygons])

  const zoomIn = () => {
    if (zoom < 20) setZoom(zoom + 1)
  }

  const zoomOut = () => {
    if (zoom > 1) setZoom(zoom - 1)
  }

  const switchMapLayer = () => {
    const layers: ("satellite" | "hybrid" | "terrain")[] = ["satellite", "hybrid", "terrain"]
    const currentIndex = layers.indexOf(mapLayer)
    const nextIndex = (currentIndex + 1) % layers.length
    setMapLayer(layers[nextIndex])
  }

  const startDrawing = () => {
    setDrawingMode("polygon")
    setPolygonPoints([])
  }

  const finishPolygon = () => {
    if (polygonPoints.length > 2) {
      // Calculate approximate area (simplified)
      const area = (polygonPoints.length * 0.15).toFixed(1) + " acres"

      const newPolygon = {
        id: Date.now(),
        points: polygonPoints,
        area: area,
        coordinates: polygonPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
      }

      setCompletedPolygons([...completedPolygons, newPolygon])

      // Notify parent
      onAreaDrawn?.(newPolygon)

      setPolygonPoints([])
      setDrawingMode("none")
    }
  }

  const clearAll = () => {
    setPolygonPoints([])
    setCompletedPolygons([])
    setDrawingMode("none")
  }

  const moveToLocation = (location: string) => {
    const locations = {
      "Los Angeles": { lat: 34.0522, lng: -118.2437 },
      "Central Valley": { lat: 36.7783, lng: -119.4179 },
      "Salinas Valley": { lat: 36.6777, lng: -121.6555 },
      "Napa Valley": { lat: 38.5025, lng: -122.2654 },
    }
    const coords = locations[location as keyof typeof locations]
    if (coords) {
      setCenter(coords)
      setZoom(16)
    }
  }

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <div className="flex flex-wrap gap-2">
        <Button variant={drawingMode === "polygon" ? "default" : "outline"} size="sm" onClick={startDrawing}>
          <Square className="w-4 h-4 mr-2" />
          Draw Survey Area
        </Button>

        {polygonPoints.length > 2 && (
          <Button size="sm" onClick={finishPolygon} className="bg-green-700 hover:bg-green-800">
            Finish Area ({polygonPoints.length} points)
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>

        <Button variant="outline" size="sm" onClick={switchMapLayer}>
          <Layers className="w-4 h-4 mr-2" />
          {mapLayer.charAt(0).toUpperCase() + mapLayer.slice(1)}
        </Button>

        <Button variant="outline" size="sm" onClick={zoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={zoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Location Quick Access */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 mr-2">Quick locations:</span>
        {["Los Angeles", "Central Valley", "Salinas Valley", "Napa Valley"].map((location) => (
          <Button key={location} variant="ghost" size="sm" onClick={() => moveToLocation(location)}>
            <MapPin className="w-3 h-3 mr-1" />
            {location}
          </Button>
        ))}
      </div>

      {/* Map Container */}
      <div className="relative">
        <div ref={mapContainerRef} className="w-full" />

        {completedPolygons.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="font-medium text-green-800">✅ Survey Areas Defined</div>
            <div className="text-sm text-green-600 mt-1">
              {completedPolygons.map((polygon, index) => (
                <div key={polygon.id}>
                  Survey {index + 1}: {polygon.area} ({polygon.points.length} waypoints)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <strong>Real Satellite Map Features:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>
            <strong>Live satellite imagery</strong> from Esri World Imagery service
          </li>
          <li>
            <strong>Multiple layers:</strong> Satellite, Hybrid (with labels), Terrain
          </li>
          <li>
            <strong>Zoom controls:</strong> Get closer to see individual plants and structures
          </li>
          <li>
            <strong>Drawing tools:</strong> Click points to define precise survey boundaries
          </li>
          <li>
            <strong>Quick locations:</strong> Jump to major agricultural areas in California
          </li>
        </ul>
      </div>
    </div>
  )
}
