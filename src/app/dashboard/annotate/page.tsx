'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Save, Undo, RotateCw } from 'lucide-react'

interface PlantAnnotation {
  x: number
  y: number
  category: string
}

export default function AnnotatePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [annotations, setAnnotations] = useState<PlantAnnotation[]>([])
  const [currentCategory, setCurrentCategory] = useState('small_plant')
  const [isLoading, setIsLoading] = useState(true)

  // Categories specific to your nursery
  const categories = [
    { id: 'small_plant', name: 'Small Plant', color: '#10b981' },
    { id: 'medium_plant', name: 'Medium Plant', color: '#3b82f6' },
    { id: 'large_plant', name: 'Large Plant', color: '#8b5cf6' },
    { id: 'palm', name: 'Palm/Tree', color: '#f59e0b' },
    { id: 'ground_cover', name: 'Ground Cover', color: '#ec4899' },
    { id: 'not_plant', name: 'Not a Plant', color: '#6b7280' }
  ]

  useEffect(() => {
    loadImages()
  }, [])

  useEffect(() => {
    if (images.length > 0) {
      loadImageToCanvas()
      loadExistingAnnotations()
    }
  }, [currentIndex, images])

  useEffect(() => {
    if (images.length > 0) {
      drawAnnotations()
    }
  }, [annotations])

  const loadImages = async () => {
    const { data, error } = await supabase.storage
      .from('flight-images')
      .list('aerial-photos', {
        limit: 100,
        offset: 0
      })

    if (data) {
      const urls = data.map(file => {
        const { data: urlData } = supabase.storage
          .from('flight-images')
          .getPublicUrl(`aerial-photos/${file.name}`)
        return urlData.publicUrl
      })
      setImages(urls)
      setIsLoading(false)
    }
  }

  const loadExistingAnnotations = async () => {
    if (!images[currentIndex]) return

    const { data } = await supabase
      .from('plant_annotations')
      .select('annotations')
      .eq('image_url', images[currentIndex])
      .single()

    if (data) {
      setAnnotations(data.annotations || [])
    } else {
      setAnnotations([])
    }
  }

  const loadImageToCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !images[currentIndex]) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      drawAnnotations()
    }
    img.src = images[currentIndex]
  }

  const drawAnnotations = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Redraw image first
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      
      // Draw each annotation
      annotations.forEach((ann, idx) => {
        const category = categories.find(c => c.id === ann.category)
        if (!category) return

        // Draw circle
        ctx.beginPath()
        ctx.arc(ann.x, ann.y, 12, 0, 2 * Math.PI)
        ctx.fillStyle = category.color + '66' // 40% opacity
        ctx.fill()
        ctx.strokeStyle = category.color
        ctx.lineWidth = 3
        ctx.stroke()

        // Draw number
        ctx.fillStyle = 'white'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText((idx + 1).toString(), ann.x, ann.y)
      })

      // Update count display
      updateStats()
    }
    img.src = images[currentIndex]
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newAnnotation: PlantAnnotation = {
      x,
      y,
      category: currentCategory
    }

    setAnnotations([...annotations, newAnnotation])
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
        annotations: annotations,
        plant_counts: plantCounts,
        total_plants: annotations.filter(a => a.category !== 'not_plant').length,
        annotated_at: new Date().toISOString()
      })

    if (!error) {
      alert('Saved!')
      // Move to next image
      if (currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
  }

  const updateStats = () => {
    // Stats are displayed in the UI
  }

  if (isLoading) {
    return <div className="p-8">Loading images...</div>
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            Annotate Plants - Image {currentIndex + 1} of {images.length}
          </h1>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setAnnotations(annotations.slice(0, -1))}
              variant="outline"
              disabled={annotations.length === 0}
            >
              <Undo className="w-4 h-4 mr-2" />
              Undo
            </Button>
            
            <Button 
              onClick={saveAnnotations}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Next
            </Button>
          </div>
        </div>

        {/* Category selector */}
        <div className="flex gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCurrentCategory(cat.id)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                currentCategory === cat.id 
                  ? 'border-gray-900 shadow-lg' 
                  : 'border-gray-300'
              }`}
              style={{
                backgroundColor: currentCategory === cat.id ? cat.color + '20' : 'white'
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="border rounded-lg overflow-auto max-h-[600px] mb-4">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="cursor-crosshair"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4">
          {categories.map(cat => {
            const count = annotations.filter(a => a.category === cat.id).length
            return (
              <div key={cat.id} className="text-center p-3 bg-gray-50 rounded">
                <div 
                  className="w-4 h-4 rounded-full mx-auto mb-2" 
                  style={{ backgroundColor: cat.color }}
                />
                <div className="text-xs text-gray-600">{cat.name}</div>
                <div className="text-xl font-bold">{count}</div>
              </div>
            )
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-600 py-2">
            Total plants: {annotations.filter(a => a.category !== 'not_plant').length}
          </span>
          
          <Button
            onClick={() => setCurrentIndex(Math.min(images.length - 1, currentIndex + 1))}
            disabled={currentIndex === images.length - 1}
            variant="outline"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  )
}