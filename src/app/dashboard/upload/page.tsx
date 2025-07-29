// app/dashboard/upload/page.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/lib/auth/protected-route'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileImage,
  Trash2,
  Play,
  BarChart3,
  Download,
  Eye,
} from 'lucide-react'

interface UploadedImage {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error'
  progress: number
}

interface ProcessingResult {
  plantCount: number
  confidence: number
  densityMapUrl?: string
  processingTime: number
  individualPlants?: Array<{
    x: number
    y: number
    confidence: number
    size: 'small' | 'medium' | 'large'
  }>
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  )
}

function UploadContent() {
  const { user, isDemo } = useAuth()
  const router = useRouter()
  const [images, setImages] = useState<UploadedImage[]>([])
  const [selectedPlot, setSelectedPlot] = useState('')
  const [selectedFlight, setSelectedFlight] = useState('')
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ProcessingResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )
    handleFiles(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const newImages: UploadedImage[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }))
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }

  const simulateUpload = async (image: UploadedImage) => {
    // Update status to uploading
    setImages(prev =>
      prev.map(img =>
        img.id === image.id ? { ...img, status: 'uploading' } : img
      )
    )

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      setImages(prev =>
        prev.map(img =>
          img.id === image.id ? { ...img, progress } : img
        )
      )
    }

    // Mark as uploaded
    setImages(prev =>
      prev.map(img =>
        img.id === image.id ? { ...img, status: 'uploaded' } : img
      )
    )
  }

  const handleProcessImages = async () => {
    if (!selectedPlot || !selectedFlight) {
      alert('Please select a plot and flight before processing images')
      return
    }

    setProcessing(true)
    setUploadProgress(0)

    try {
      if (isDemo) {
        // Demo mode processing
        // Upload all images
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          if (image.status === 'pending') {
            await simulateUpload(image)
          }
          setUploadProgress(((i + 1) / images.length) * 30)
        }

        // Mark all as processing
        setImages(prev =>
          prev.map(img => ({ ...img, status: 'processing' }))
        )

        // Simulate ML processing stages
        const stages = [
          { progress: 40, message: "Detecting plants..." },
          { progress: 60, message: "Classifying plant sizes..." },
          { progress: 80, message: "Generating density map..." },
          { progress: 90, message: "Finalizing results..." }
        ]

        for (const stage of stages) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          setUploadProgress(stage.progress)
        }

        // Generate realistic results based on image count
        const baseCount = Math.floor(Math.random() * 100) + 50
        const plantCount = baseCount * images.length
        const confidence = 95 + Math.random() * 4
        
        // Generate mock plant positions
        const individualPlants = Array.from({ length: Math.min(plantCount, 100) }, () => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          confidence: 85 + Math.random() * 15,
          size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)] as 'small' | 'medium' | 'large'
        }))

        setResults({
          plantCount,
          confidence,
          processingTime: 3.2,
          densityMapUrl: '/demo-density-map.png',
          individualPlants
        })

        // Mark all as completed
        setImages(prev =>
          prev.map(img => ({ ...img, status: 'completed' }))
        )
        
        setUploadProgress(100)

        // Save to demo data
        alert(`Processing complete!\n\nPlants detected: ${plantCount}\nConfidence: ${confidence.toFixed(1)}%\n\nResults saved to Plot: ${getPlotName(selectedPlot)}`)

      } else {
        // Real implementation would:
        // 1. Upload images to Supabase Storage or S3
        // 2. Create a processing job in the database
        // 3. Trigger ML processing via Edge Function or external API
        // 4. Poll for results or use websockets for real-time updates
        
        // For now, show placeholder
        alert('Full ML processing requires backend setup. Please use demo mode to see the workflow.')
      }
    } catch (error) {
      console.error('Processing error:', error)
      setImages(prev =>
        prev.map(img => ({ ...img, status: 'error' }))
      )
    } finally {
      setProcessing(false)
    }
  }

  const getPlotName = (plotId: string) => {
    const plots: Record<string, string> = {
      '1': 'North Field A',
      '2': 'Greenhouse Block B',
      '3': 'South Nursery'
    }
    return plots[plotId] || 'Unknown Plot'
  }

  const downloadResults = () => {
    if (!results) return

    // Create CSV data
    const csvData = `Plant Count Analysis Report
Plot: ${getPlotName(selectedPlot)}
Date: ${new Date().toLocaleDateString()}
Total Plants: ${results.plantCount}
Confidence: ${results.confidence.toFixed(1)}%
Processing Time: ${results.processingTime}s

Individual Plant Data:
X,Y,Confidence,Size
${results.individualPlants?.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.confidence.toFixed(1)},${p.size}`).join('\n') || ''}
`

    // Create and download file
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plant-count-${selectedPlot}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalSize = images.reduce((sum, img) => sum + img.file.size, 0)
  const readyToProcess = images.length > 0 && selectedPlot && selectedFlight && images.every(img => 
    img.status === 'pending' || img.status === 'uploaded'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Drone Images</h1>
              <p className="text-sm text-gray-600">Process aerial imagery for plant counting</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Flight Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Flight</CardTitle>
              <CardDescription>Choose which flight these images belong to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Plot</label>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedPlot}
                    onChange={(e) => setSelectedPlot(e.target.value)}
                  >
                    <option value="">Select a plot...</option>
                    <option value="1">North Field A</option>
                    <option value="2">Greenhouse Block B</option>
                    <option value="3">South Nursery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Flight</label>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedFlight}
                    onChange={(e) => setSelectedFlight(e.target.value)}
                    disabled={!selectedPlot}
                  >
                    <option value="">Select a flight...</option>
                    <option value="1">Today's Morning Flight</option>
                    <option value="2">Yesterday's Survey</option>
                    <option value="new">Create New Flight Record</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
              <CardDescription>
                Drag and drop aerial images or click to browse. Supports JPG, PNG, TIFF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drop images here or click to upload
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports JPG, PNG, TIFF up to 50MB each
                  </p>
                </label>
              </div>

              {images.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium">
                      {images.length} image{images.length !== 1 ? 's' : ''} selected
                      ({(totalSize / 1024 / 1024).toFixed(1)} MB)
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImages([])}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.preview}
                          alt="Uploaded"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        
                        {/* Status overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          {image.status === 'pending' && (
                            <FileImage className="w-6 h-6 text-white" />
                          )}
                          {image.status === 'uploading' && (
                            <div className="text-white text-xs">
                              <Loader2 className="w-6 h-6 animate-spin mb-1" />
                              {image.progress}%
                            </div>
                          )}
                          {image.status === 'uploaded' && (
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          )}
                          {image.status === 'processing' && (
                            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                          )}
                          {image.status === 'completed' && (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          )}
                          {image.status === 'error' && (
                            <AlertCircle className="w-6 h-6 text-red-500" />
                          )}
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleProcessImages}
                  disabled={!readyToProcess || processing}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Process Images
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Processing Progress */}
          {processing && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Images</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={uploadProgress} className="mb-4" />
                <p className="text-sm text-gray-600">
                  {uploadProgress < 30 && "Uploading images..."}
                  {uploadProgress >= 30 && uploadProgress < 40 && "Initializing ML model..."}
                  {uploadProgress >= 40 && uploadProgress < 60 && "Detecting plants..."}
                  {uploadProgress >= 60 && uploadProgress < 80 && "Classifying plant sizes..."}
                  {uploadProgress >= 80 && uploadProgress < 90 && "Generating density map..."}
                  {uploadProgress >= 90 && "Finalizing results..."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && !processing && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>
                  AI-powered plant detection and counting complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800 mb-2">
                        Plant Count Analysis
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Plants:</span>
                          <span className="font-bold text-xl text-green-700">
                            {results.plantCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Confidence:</span>
                          <span className="font-medium">
                            {results.confidence.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Processing Time:</span>
                          <span className="font-medium">
                            {results.processingTime}s
                          </span>
                        </div>
                      </div>
                    </div>

                    {results.individualPlants && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-blue-800 mb-2">
                          Plant Size Distribution
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Small:</span>
                            <span className="font-medium">
                              {results.individualPlants.filter(p => p.size === 'small').length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Medium:</span>
                            <span className="font-medium">
                              {results.individualPlants.filter(p => p.size === 'medium').length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Large:</span>
                            <span className="font-medium">
                              {results.individualPlants.filter(p => p.size === 'large').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <Button onClick={downloadResults} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </Button>
                      <Link href={`/dashboard/plots/${selectedPlot}`}>
                        <Button variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          View Plot
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Density Heatmap</h3>
                    <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">
                          Plant density visualization
                        </p>
                        <p className="text-sm text-gray-500">
                          {isDemo ? "Demo heatmap" : "Processing complete"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ML Processing Info */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-green-700" />
                  </div>
                  <h4 className="font-medium mb-1">1. Upload Images</h4>
                  <p className="text-sm text-gray-600">
                    Select high-quality drone images from your survey flight
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Loader2 className="w-6 h-6 text-blue-700" />
                  </div>
                  <h4 className="font-medium mb-1">2. AI Processing</h4>
                  <p className="text-sm text-gray-600">
                    Advanced ML models detect and count individual plants
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-purple-700" />
                  </div>
                  <h4 className="font-medium mb-1">3. Get Results</h4>
                  <p className="text-sm text-gray-600">
                    Receive detailed analytics and downloadable reports
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}