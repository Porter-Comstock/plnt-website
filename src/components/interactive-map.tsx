"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, Square, Trash2 } from "lucide-react"

interface MapArea {
  type: string
  points: { x: number; y: number }[]
  area: string
}

interface Marker {
  x: number
  y: number
  type: string
}

// Simple interactive map component using HTML5 Canvas
export default function InteractiveMap({ onAreaDrawn }: { onAreaDrawn?: (area: MapArea) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawingMode, setDrawingMode] = useState<"none" | "polygon" | "marker">("none")
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const [markers, setMarkers] = useState<Marker[]>([])
  const [drawnPolygons, setDrawnPolygons] = useState<{ x: number; y: number }[][]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background (satellite-like)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, "#10B981")
    gradient.addColorStop(0.3, "#059669")
    gradient.addColorStop(0.7, "#047857")
    gradient.addColorStop(1, "#065F46")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add some "field" patterns
    ctx.fillStyle = "rgba(34, 197, 94, 0.3)"
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(i * 80 + 20, 50, 60, 40)
      ctx.fillRect(i * 80 + 20, 120, 60, 40)
      ctx.fillRect(i * 80 + 20, 190, 60, 40)
    }

    // Draw completed polygons
    drawnPolygons.forEach((polygon, index) => {
      if (polygon.length > 2) {
        ctx.beginPath()
        ctx.moveTo(polygon[0].x, polygon[0].y)
        polygon.forEach((point) => ctx.lineTo(point.x, point.y))
        ctx.closePath()
        ctx.strokeStyle = "#8B5CF6"
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.fillStyle = "rgba(139, 92, 246, 0.2)"
        ctx.fill()

        // Add polygon label
        const centerX = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length
        const centerY = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length
        ctx.fillStyle = "#8B5CF6"
        ctx.font = "12px sans-serif"
        ctx.fillText(`Plot ${index + 1}`, centerX - 20, centerY)
      }
    })

    // Draw current polygon being drawn
    if (points.length > 0) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      points.forEach((point) => ctx.lineTo(point.x, point.y))
      if (drawingMode === "polygon") {
        ctx.strokeStyle = "#8B5CF6"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw points
      points.forEach((point) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
        ctx.fillStyle = "#8B5CF6"
        ctx.fill()
      })
    }

    // Draw markers
    markers.forEach((marker) => {
      ctx.beginPath()
      ctx.arc(marker.x, marker.y, 8, 0, 2 * Math.PI)
      ctx.fillStyle = marker.type === "start" ? "#EF4444" : "#3B82F6"
      ctx.fill()
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 2
      ctx.stroke()

      // Add marker label
      ctx.fillStyle = "#374151"
      ctx.font = "10px sans-serif"
      ctx.fillText(marker.type === "start" ? "Start" : "Point", marker.x + 12, marker.y + 4)
    })

    // Draw flight path if polygon is complete
    if (drawnPolygons.length > 0) {
      drawnPolygons.forEach((polygon) => {
        if (polygon.length > 2) {
          // Simple lawnmower pattern
          const minX = Math.min(...polygon.map((p) => p.x))
          const maxX = Math.max(...polygon.map((p) => p.x))
          const minY = Math.min(...polygon.map((p) => p.y))
          const maxY = Math.max(...polygon.map((p) => p.y))

          ctx.strokeStyle = "#06B6D4"
          ctx.lineWidth = 1
          ctx.setLineDash([5, 5])

          for (let y = minY + 10; y < maxY; y += 15) {
            ctx.beginPath()
            ctx.moveTo(minX + 5, y)
            ctx.lineTo(maxX - 5, y)
            ctx.stroke()
          }
          ctx.setLineDash([])
        }
      })
    }
  }, [points, markers, drawnPolygons, drawingMode])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (drawingMode === "polygon") {
      const newPoints = [...points, { x, y }]
      setPoints(newPoints)
    } else if (drawingMode === "marker") {
      const newMarker = { x, y, type: markers.length === 0 ? "start" : "waypoint" }
      setMarkers([...markers, newMarker])
      setDrawingMode("none")
    }
  }

  const handleCanvasDoubleClick = () => {
    if (drawingMode === "polygon" && points.length > 2) {
      // Complete the polygon
      setDrawnPolygons([...drawnPolygons, points])
      setPoints([])
      setDrawingMode("none")

      // Calculate area (simplified)
      const area = points.length * 0.1 // Rough area calculation
      onAreaDrawn?.({
        type: "polygon",
        points: points,
        area: area.toFixed(1) + " acres",
      })
    }
  }

  const startDrawingPolygon = () => {
    setDrawingMode("polygon")
    setPoints([])
  }

  const addMarker = () => {
    setDrawingMode("marker")
  }

  const clearAll = () => {
    setPoints([])
    setMarkers([])
    setDrawnPolygons([])
    setDrawingMode("none")
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button variant={drawingMode === "polygon" ? "default" : "outline"} size="sm" onClick={startDrawingPolygon}>
          <Square className="w-4 h-4 mr-2" />
          Draw Area
        </Button>
        <Button variant={drawingMode === "marker" ? "default" : "outline"} size="sm" onClick={addMarker}>
          <MapPin className="w-4 h-4 mr-2" />
          Add Marker
        </Button>
        <Button variant="outline" size="sm" onClick={clearAll}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="border rounded-lg cursor-crosshair bg-gray-100"
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
        />

        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow-sm text-xs">
          <div className="font-medium">Interactive Map</div>
          <div className="text-gray-600">
            {drawingMode === "polygon" && "Click to add points, double-click to finish"}
            {drawingMode === "marker" && "Click to place marker"}
            {drawingMode === "none" && "Select a tool to start drawing"}
          </div>
        </div>

        {drawnPolygons.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-sm text-xs">
            <div className="font-medium text-green-600">✓ {drawnPolygons.length} area(s) defined</div>
            <div className="text-gray-600">Flight path generated</div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        <strong>Instructions:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Click {'"Draw Area"'} then click points to create survey boundary</li>
          <li>Double-click to complete the polygon</li>
          <li>Use {'"Add Marker"'} to set drone start/landing points</li>
          <li>Flight paths are automatically generated for completed areas</li>
        </ul>
      </div>
    </div>
  )
}
