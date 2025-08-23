'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Save, Undo, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react'

interface PlantAnnotation {
  x: number
  y: number
  category: string
  id?: string // Add unique ID for each annotation
}

export default function AnnotatePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const baseImgRef = useRef<HTMLImageElement | null>(null)

  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [annotations, setAnnotations] = useState<PlantAnnotation[]>([])
  const [currentCategory, setCurrentCategory] = useState('small_plant')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)

  // View state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [mode, setMode] = useState<'annotate' | 'pan'>('annotate')

  // Categories with visual adjustments - optimized for nursery aerial imagery
  const categories = [
    { id: 'small_plant',  name: 'Small Plant',  color: '#10b981', dotSize: 6 },
    { id: 'medium_plant', name: 'Medium Plant', color: '#3b82f6', dotSize: 8 },
    { id: 'large_plant',  name: 'Large Plant',  color: '#8b5cf6', dotSize: 10 },
    { id: 'palm',         name: 'Palm/Tree',    color: '#f59e0b', dotSize: 12 },
    { id: 'ground_cover', name: 'Ground Cover', color: '#ec4899', dotSize: 5 },
    { id: 'not_plant',    name: 'Not a Plant',  color: '#6b7280', dotSize: 6 }
  ]

  // Load images
  useEffect(() => { loadImages() }, [])

  // Load image and annotations when index changes
  useEffect(() => {
    if (images.length > 0) {
      loadImageToCanvas()
      loadExistingAnnotations()
    }
  }, [currentIndex, images])

  // Redraw when annotations, zoom, or pan changes
  useEffect(() => {
    drawCanvas()
  }, [annotations, zoom, pan, selectedAnnotation])

  const loadImages = async () => {
    setIsLoading(true)
    
    const { data: list, error } = await supabase.storage
      .from('training-images')
      .list('aerial-training', { limit: 200, sortBy: { column: 'name', order: 'asc' } })

    if (error) {
      console.error('Supabase list error:', error)
      setIsLoading(false)
      return
    }

    const imagePaths = (list ?? [])
      .filter(f => f.name && /\.(png|jpe?g|webp)$/i.test(f.name))
      .map(f => `aerial-training/${f.name}`)

    const { data: signed } = await supabase.storage
      .from('training-images')
      .createSignedUrls(imagePaths, 60 * 60)

    setImages((signed ?? []).map(s => s.signedUrl))
    setIsLoading(false)
  }

  const loadExistingAnnotations = async () => {
    if (!images[currentIndex]) return
    
    const { data } = await supabase
      .from('plant_annotations')
      .select('annotations')
      .eq('image_url', images[currentIndex])
      .single()

    // Add IDs to existing annotations if they don't have them
    const annotationsWithIds = (data?.annotations || []).map((ann: PlantAnnotation) => ({
      ...ann,
      id: ann.id || Math.random().toString(36).substr(2, 9)
    }))
    
    setAnnotations(annotationsWithIds)
  }

  const loadImageToCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !images[currentIndex]) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      baseImgRef.current = img
      
      // Set canvas size to match image
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      // Reset view
      setZoom(1)
      setPan({ x: 0, y: 0 })
      
      drawCanvas()
    }
    
    img.src = images[currentIndex]
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const img = baseImgRef.current
    
    if (!canvas || !ctx || !img) return

    // Clear and reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Apply zoom and pan
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    
    // Draw image
    ctx.drawImage(img, 0, 0)
    
    // Draw annotations with smart overlap handling
    annotations.forEach((ann, idx) => {
      const category = categories.find(c => c.id === ann.category)
      if (!category) return
      
      const isSelected = ann.id === selectedAnnotation
      const dotSize = category.dotSize // Don't scale when selected
      
      // Draw circle
      ctx.beginPath()
      ctx.arc(ann.x, ann.y, dotSize, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? `${category.color}99` : `${category.color}66`
      ctx.fill()
      ctx.lineWidth = isSelected ? 4 : 2
      ctx.strokeStyle = category.color
      ctx.stroke()
      
      // Draw number label with background for visibility
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform for consistent text size
      
      const textX = ann.x * zoom + pan.x
      const textY = ann.y * zoom + pan.y
      
      // Background for text
      ctx.beginPath()
      ctx.arc(textX, textY, 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fill()
      
      // Text - use idx + 1 to show 1-based numbering
      ctx.fillStyle = '#000'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((idx + 1).toString(), textX, textY)
      ctx.restore()
    })
  }

  // Convert mouse position to image coordinates
  const getImageCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    
    // Get mouse position relative to canvas
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top
    
    // Scale to actual canvas size (handles CSS scaling)
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const scaledX = canvasX * scaleX
    const scaledY = canvasY * scaleY
    
    // Convert to image coordinates (account for zoom and pan)
    const imageX = (scaledX - pan.x) / zoom
    const imageY = (scaledY - pan.y) / zoom
    
    return { x: imageX, y: imageY }
  }

  // Check if click is near an annotation
  const findAnnotationAt = (x: number, y: number): PlantAnnotation | null => {
    const threshold = 15 / zoom // Adjust threshold based on zoom
    
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i]
      const dist = Math.sqrt(Math.pow(x - ann.x, 2) + Math.pow(y - ann.y, 2))
      if (dist < threshold) return ann
    }
    return null
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  // Don't annotate if we're in pan mode or if shift is held (panning)
  if (mode === 'pan' || e.shiftKey || isPanning) return
  
  const coords = getImageCoordinates(e)
  
  // Check if clicking on existing annotation
  const existingAnn = findAnnotationAt(coords.x, coords.y)
  
  if (existingAnn) {
    // Select the annotation
    setSelectedAnnotation(existingAnn.id || null)  // Line 242 - this is fine
  } else {
    // Add new annotation
    const newAnnotation: PlantAnnotation = {
      x: coords.x,
      y: coords.y,
      category: currentCategory,
      id: Math.random().toString(36).substr(2, 9)
    }
    setAnnotations(prev => [...prev, newAnnotation])
    setSelectedAnnotation(newAnnotation.id || null)  // Line 253 - FIXED: changed from existingAnn to newAnnotation
  }
}

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'pan' || e.shiftKey) {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Remove wheel zoom handler completely

  const zoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5)
    const canvas = canvasRef.current
    if (canvas) {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const zoomDiff = newZoom - zoom
      setPan({
        x: pan.x - centerX * zoomDiff,
        y: pan.y - centerY * zoomDiff
      })
    }
    setZoom(newZoom)
  }

  const zoomOut = () => {
    const newZoom = Math.max(zoom * 0.8, 0.5)
    const canvas = canvasRef.current
    if (canvas) {
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const zoomDiff = newZoom - zoom
      setPan({
        x: pan.x - centerX * zoomDiff,
        y: pan.y - centerY * zoomDiff
      })
    }
    setZoom(newZoom)
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const deleteSelected = () => {
    if (selectedAnnotation) {
      setAnnotations(prev => prev.filter(ann => ann.id !== selectedAnnotation))
      setSelectedAnnotation(null)
    }
  }

  const saveAnnotations = async () => {
    if (!images[currentIndex]) return

    const plantCounts = categories.reduce((acc, cat) => {
      acc[cat.id] = annotations.filter(a => a.category === cat.id).length
      return acc
    }, {} as Record<string, number>)

    const { error } = await supabase
      .from('plant_annotations')
      .upsert({
        image_url: images[currentIndex],
        image_name: images[currentIndex].split('/').pop(),
        annotations: annotations.map(({ id, ...ann }) => ann), // Remove IDs before saving
        plant_counts: plantCounts,
        total_plants: annotations.filter(a => a.category !== 'not_plant').length,
        annotated_at: new Date().toISOString()
      })

    if (!error) {
      alert('Saved successfully!')
      if (currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    } else {
      alert('Error saving: ' + error.message)
    }
  }

  if (isLoading) return <div className="p-8">Loading images...</div>

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Card className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            Annotate Plants - Image {currentIndex + 1} of {images.length}
          </h1>
          
          <div className="flex gap-2">
            <Button
              variant={mode === 'annotate' ? 'default' : 'outline'}
              onClick={() => setMode('annotate')}
              size="sm"
            >
              Annotate
            </Button>
            <Button
              variant={mode === 'pan' ? 'default' : 'outline'}
              onClick={() => setMode('pan')}
              size="sm"
            >
              <Move className="w-4 h-4 mr-2" /> Pan
            </Button>
            
            <div className="border-l mx-2" />
            
            <Button onClick={zoomIn} variant="outline" size="sm">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button onClick={zoomOut} variant="outline" size="sm">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button onClick={resetView} variant="outline" size="sm">
              <RotateCw className="w-4 h-4" />
            </Button>
            
            <div className="border-l mx-2" />
            
            <Button 
              onClick={() => setAnnotations(annotations.slice(0, -1))} 
              variant="outline"
              size="sm"
              disabled={annotations.length === 0}
            >
              <Undo className="w-4 h-4 mr-2" /> Undo
            </Button>
            
            {selectedAnnotation && (
              <Button onClick={deleteSelected} variant="destructive" size="sm">
                Delete Selected
              </Button>
            )}
            
            <Button onClick={saveAnnotations} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" /> Save & Next
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm">
          <strong>Instructions:</strong> 
          {mode === 'annotate' 
            ? ' Click to add annotations. Click existing annotations to select them.'
            : ' Click and drag to pan the image.'}
          <br />
          <strong>Tip:</strong> Hold Shift + drag to pan while in annotation mode. Use +/- buttons to zoom.
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCurrentCategory(cat.id)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                currentCategory === cat.id 
                  ? 'border-gray-900 shadow-lg scale-105' 
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ 
                backgroundColor: currentCategory === cat.id ? cat.color + '20' : 'white' 
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="rounded-full" 
                  style={{ 
                    backgroundColor: cat.color,
                    width: `${cat.dotSize * 2}px`,
                    height: `${cat.dotSize * 2}px`
                  }} 
                />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div 
          ref={containerRef}
          className="border-2 border-gray-300 rounded-lg overflow-hidden mb-4"
          style={{ maxHeight: '600px' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="block w-full h-auto"
            style={{ 
              cursor: mode === 'pan' || isPanning ? 'move' : 'crosshair',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
          {categories.map(cat => {
            const count = annotations.filter(a => a.category === cat.id).length
            return (
              <div key={cat.id} className="text-center p-3 bg-gray-50 rounded">
                <div 
                  className="rounded-full mx-auto mb-2" 
                  style={{ 
                    backgroundColor: cat.color,
                    width: '20px',
                    height: '20px'
                  }} 
                />
                <div className="text-xs text-gray-600">{cat.name}</div>
                <div className="text-xl font-bold">{count}</div>
              </div>
            )
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
            disabled={currentIndex === 0} 
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>

          <div className="text-center">
            <div className="text-lg font-semibold">
              Total plants: {annotations.filter(a => a.category !== 'not_plant').length}
            </div>
            <div className="text-sm text-gray-600">
              Zoom: {(zoom * 100).toFixed(0)}%
            </div>
          </div>

          <Button 
            onClick={() => setCurrentIndex(Math.min(images.length - 1, currentIndex + 1))} 
            disabled={currentIndex === images.length - 1} 
            variant="outline"
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  )
}