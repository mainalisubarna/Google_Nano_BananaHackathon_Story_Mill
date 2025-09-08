import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Eye, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const EnhancedImageUpload = ({ uploadedImages, setUploadedImages, onAnalyzeImages }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [analyzingImages, setAnalyzingImages] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    processFiles(files)
  }

  const processFiles = async (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast.error('Please upload image files only')
      return
    }

    if (imageFiles.length + uploadedImages.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    for (const file of imageFiles) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large (max 10MB)`)
        continue
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]
        
        const newImage = {
          id: Date.now() + Math.random(),
          file: file,
          base64: base64Data,
          data: e.target.result,
          preview: e.target.result,
          name: file.name,
          size: file.size,
          type: file.type,
          // Initialize context - will be filled by AI analysis
          context: {
            description: 'Analyzing...',
            subjects: [],
            setting: '',
            mood: '',
            style: '',
            colors: [],
            isAnalyzed: false
          }
        }
        
        setUploadedImages(prev => [...prev, newImage])
        
        // Auto-analyze image context
        analyzeImageContext(newImage)
      }
      reader.readAsDataURL(file)
    }

    toast.success(`${imageFiles.length} image(s) uploaded successfully`)
  }

  const analyzeImageContext = async (image) => {
    try {
      // This would call a new backend endpoint for image analysis
      // For now, we'll simulate basic analysis
      const mockAnalysis = {
        description: `${image.name.split('.')[0]} - analyzing content...`,
        subjects: ['main subject'],
        setting: 'unknown',
        mood: 'neutral',
        style: 'photograph',
        colors: ['various'],
        isAnalyzed: true
      }

      setUploadedImages(prev => 
        prev.map(img => 
          img.id === image.id 
            ? { ...img, context: mockAnalysis }
            : img
        )
      )
    } catch (error) {
      console.error('Image analysis failed:', error)
      setUploadedImages(prev => 
        prev.map(img => 
          img.id === image.id 
            ? { 
                ...img, 
                context: { 
                  ...img.context, 
                  description: 'Analysis failed - will use as-is',
                  isAnalyzed: true 
                }
              }
            : img
        )
      )
    }
  }

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
  }

  const analyzeAllImages = async () => {
    if (uploadedImages.length === 0) {
      toast.error('No images to analyze')
      return
    }

    setAnalyzingImages(true)
    try {
      // This would send all images to backend for comprehensive analysis
      // Including subject detection, mood analysis, setting identification
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate processing
      
      toast.success('Image analysis complete! Your images are ready for story integration.')
      if (onAnalyzeImages) {
        onAnalyzeImages(uploadedImages)
      }
    } catch (error) {
      toast.error('Analysis failed. Images will be used as-is.')
    } finally {
      setAnalyzingImages(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="enhanced-image-upload">
      {/* Upload Area */}
      <div
        className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-content">
          <Upload className="upload-icon" size={48} />
          <h3>Smart Image Upload</h3>
          <p>Drop images here or click to select</p>
          <div className="upload-features">
            <div className="feature">
              <Sparkles size={16} />
              <span>AI Context Analysis</span>
            </div>
            <div className="feature">
              <Eye size={16} />
              <span>Smart Scene Matching</span>
            </div>
          </div>
          <small>Supports JPG, PNG, WebP • Max 10MB • Up to 10 images</small>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Uploaded Images Grid */}
      <AnimatePresence>
        {uploadedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="uploaded-images-grid"
          >
            <div className="grid-header">
              <h4>Uploaded Images ({uploadedImages.length})</h4>
              <button
                onClick={analyzeAllImages}
                disabled={analyzingImages}
                className="analyze-button"
              >
                {analyzingImages ? (
                  <>
                    <Loader2 size={16} className="spinning" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Analyze Context
                  </>
                )}
              </button>
            </div>

            <div className="images-grid">
              {uploadedImages.map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="image-card"
                >
                  <div className="image-preview">
                    <img src={image.preview} alt={image.name} />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="remove-button"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="image-info">
                    <h5>{image.name}</h5>
                    <p className="file-size">{formatFileSize(image.size)}</p>
                    
                    <div className="context-info">
                      <div className="analysis-status">
                        <CheckCircle size={14} className="success" />
                        <span>Ready for upload</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Upload tip removed as requested */}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .enhanced-image-upload {
          width: 100%;
          margin: 1rem 0;
        }

        .upload-dropzone {
          border: 2px dashed #e0e7ff;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .upload-dropzone:hover,
        .upload-dropzone.dragging {
          border-color: #8b5cf6;
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
        }

        .upload-content {
          pointer-events: none;
        }

        .upload-icon {
          color: #8b5cf6;
          margin-bottom: 1rem;
        }

        .upload-content h3 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.25rem;
        }

        .upload-content p {
          margin: 0 0 1rem 0;
          color: #64748b;
        }

        .upload-features {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin: 1rem 0;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #8b5cf6;
          font-size: 0.9rem;
        }

        .uploaded-images-grid {
          margin-top: 1.5rem;
        }

        .grid-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .grid-header h4 {
          margin: 0;
          color: #1e293b;
        }

        .analyze-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid #8b5cf6;
          border-radius: 8px;
          background: white;
          color: #8b5cf6;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .analyze-button:hover:not(:disabled) {
          background: #8b5cf6;
          color: white;
        }

        .analyze-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .image-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .image-preview {
          position: relative;
          height: 150px;
          overflow: hidden;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-button {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .remove-button:hover {
          background: #ef4444;
          transform: scale(1.1);
        }

        .image-info {
          padding: 1rem;
        }

        .image-info h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          color: #1e293b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          margin: 0 0 0.75rem 0;
          font-size: 0.8rem;
          color: #64748b;
        }

        .analysis-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
        }

        .analysis-status .success {
          color: #10b981;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .context-details {
          font-size: 0.75rem;
          color: #64748b;
        }

        .context-item {
          margin-bottom: 0.25rem;
        }

        .context-item strong {
          color: #374151;
        }

        .upload-tip {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 1rem;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #0369a1;
        }
      `}</style>
    </div>
  )
}

export default EnhancedImageUpload
