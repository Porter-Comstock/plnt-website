// app/dashboard/admin/upload-training/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Image, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminUploadTrainingImages() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [existingImages, setExistingImages] = useState<number>(0)
  const [errors, setErrors] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdminAccess()
    checkExistingImages()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/signin')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    
    setIsAdmin(true)
  }

  const checkExistingImages = async () => {
    // Check how many training images already exist
    const { data, error } = await supabase.storage
      .from('training-images')
      .list('aerial-training', {
        limit: 1000
      })

    if (data) {
      setExistingImages(data.length)
    }
  }

  const handleUpload = async () => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    setErrors([])
    setProgress(0)
    let successCount = 0
    const failedUploads: string[] = []

    // Create a database entry for this batch upload
    const { data: batch } = await supabase
      .from('training_batches')
      .insert({
        total_images: files.length,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        upload_date: new Date().toISOString(),
        purpose: 'initial_training',
        notes: `Batch upload of ${files.length} nursery aerial images`
      })
      .select()
      .single()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        // Validate file
        if (!file.type.startsWith('image/')) {
          failedUploads.push(`${file.name} - Not an image file`)
          continue
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          failedUploads.push(`${file.name} - File too large (max 10MB)`)
          continue
        }

        // Generate structured filename
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `aerial-training/${timestamp}_${sanitizedName}`
        
        // Upload to training-images bucket
        const { data, error } = await supabase.storage
          .from('training-images')
          .upload(fileName, file, {
            upsert: false // Don't overwrite existing files
          })

        if (error) {
          failedUploads.push(`${file.name} - ${error.message}`)
        } else {
          successCount++
          
          // Create database record for this image
          await supabase
            .from('training_images')
            .insert({
              batch_id: batch?.id,
              file_path: fileName,
              file_name: file.name,
              file_size: file.size,
              image_dimensions: await getImageDimensions(file),
              is_annotated: false,
              uploaded_at: new Date().toISOString()
            })
        }
      } catch (err) {
        failedUploads.push(`${file.name} - Upload failed`)
      }
      
      setProgress(((i + 1) / files.length) * 100)
    }

    setUploadedCount(successCount)
    setErrors(failedUploads)
    setUploading(false)
    
    // Refresh existing count
    checkExistingImages()
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      // Validate total count
      if (selectedFiles.length > 100) {
        alert('Maximum 100 images at once. Please select fewer files.')
        return
      }
      setFiles(selectedFiles)
      setErrors([]) // Clear previous errors
      setUploadedCount(0) // Reset count
    }
  }

  if (!isAdmin) {
    return <div>Checking permissions...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Training Images</h1>
        <p className="text-gray-600">
          Upload aerial nursery images for model training. These images will be used to annotate and train the plant counting AI.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Existing Training Images</p>
              <p className="text-2xl font-bold">{existingImages}</p>
            </div>
            <Image className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready to Upload</p>
              <p className="text-2xl font-bold">{files?.length || 0}</p>
            </div>
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Upload Interface */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Training Images
            </label>
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-green-50 file:text-green-700
                hover:file:bg-green-100
                disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Accepted: JPG, PNG, WebP (max 10MB each, max 100 files)
            </p>
          </div>

          {/* File Preview */}
          {files && files.length > 0 && !uploading && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Selected Files:</p>
              <div className="max-h-32 overflow-y-auto">
                {Array.from(files).slice(0, 10).map((file, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
                {files.length > 10 && (
                  <p className="text-xs text-gray-500 mt-1">
                    ... and {files.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadedCount > 0 && !uploading && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully uploaded {uploadedCount} images to training dataset!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <p className="text-red-800 font-medium mb-1">
                  Failed to upload {errors.length} file(s):
                </p>
                <ul className="text-xs text-red-700 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleUpload}
              disabled={!files || files.length === 0 || uploading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {uploading ? (
                <>Uploading {progress.toFixed(0)}%...</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {files?.length || 0} Images
                </>
              )}
            </Button>

            {uploadedCount > 0 && !uploading && (
              <Button
                onClick={() => router.push('/dashboard/admin/annotate')}
                variant="outline"
              >
                Proceed to Annotation →
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          📋 Training Image Guidelines
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use high-resolution aerial images (drone footage preferred)</li>
          <li>• Include variety: different plant sizes, pot types, and backgrounds</li>
          <li>• Ensure images show clear plant boundaries</li>
          <li>• Mix images with black fabric and gravel backgrounds</li>
          <li>• Include some challenging cases (shadows, overlapping plants)</li>
        </ul>
      </Card>
    </div>
  )
}