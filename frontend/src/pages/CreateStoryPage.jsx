import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Mic, 
  MicOff, 
  Type, 
  Sparkles, 
  Upload,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Image as ImageIcon
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { storyAPI } from '../services/api'
import StoryPreview from '../components/StoryPreview'
import VideoLikePlayer from '../components/VideoLikePlayer'
import ProcessingSteps from '../components/ProcessingSteps'
import EnhancedImageUpload from '../components/EnhancedImageUpload'

const CreateStoryPage = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  
  const [inputMethod, setInputMethod] = useState('text') // 'text', 'voice', 'upload'
  const [storyText, setStoryText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [generatedStory, setGeneratedStory] = useState(null)
  const [error, setError] = useState(null)
  
  // Enhanced image upload functionality
  const [uploadedImages, setUploadedImages] = useState([])
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [imageContexts, setImageContexts] = useState([]) // Store analyzed image contexts
  const imageInputRef = useRef(null)

  const processingSteps = [
    { title: 'Processing', description: 'Your request is being processed...' }
  ]

  // Enhanced image analysis callback
  const handleImageAnalysis = (analyzedImages) => {
    // Convert analyzed images to contexts for backend
    const contexts = analyzedImages.map((img, index) => ({
      imageIndex: index,
      originalImage: {
        base64: img.base64,
        data: img.data,
        name: img.name,
        type: img.type
      },
      description: img.context.description,
      subjects: img.context.subjects,
      setting: img.context.setting,
      mood: img.context.mood,
      style: img.context.style,
      colors: img.context.colors,
      isAnalyzed: img.context.isAnalyzed
    }))
    
    setImageContexts(contexts)
    console.log('📸 Image contexts prepared for backend:', contexts)
  }

  // Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // 5 minutes max
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      mediaRecorderRef.current.timer = timer
    } catch (error) {
      toast.error('Could not access microphone')
      console.error('Recording error:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      clearInterval(mediaRecorderRef.current.timer)
      setIsRecording(false)
    }
  }

  const playAudio = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob))
      audio.play()
      setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
    }
  }

  const resetRecording = () => {
    setAudioBlob(null)
    setRecordingTime(0)
    setIsPlaying(false)
  }

  // File upload functionality
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioBlob(file)
        toast.success('Audio file uploaded successfully')
      } else {
        toast.error('Please upload an audio file')
      }
    }
  }

  // NEW: Image upload functionality
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const newImage = {
            id: Date.now() + Math.random(),
            file: file,
            base64: e.target.result.split(',')[1], // Remove data:image/...;base64, prefix
            preview: e.target.result,
            name: file.name
          }
          setUploadedImages(prev => [...prev, newImage])
        }
        reader.readAsDataURL(file)
      } else {
        toast.error(`${file.name} is not an image file`)
      }
    })
    
    if (files.length > 0) {
      toast.success(`${files.length} image(s) uploaded successfully`)
    }
  }

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId))
  }

  // Story generation - Enhanced with smart image integration
  const generateStory = async () => {
    if (!storyText.trim() && !audioBlob) {
      toast.error('Please provide a story text or audio recording')
      return
    }

    if (uploadedImages.length > 0 && imageContexts.length === 0) {
      toast.error('Please wait for image analysis to complete or click "Analyze Context"')
      return
    }

    setIsProcessing(true)
    setProcessingStep(0)
    setError(null)

    try {
      let requestData = {
        // Enhanced image data with contexts for smart scene integration
        uploadedImages: uploadedImages.length > 0 ? uploadedImages.map(img => ({
          base64: img.base64,
          name: img.name,
          data: img.data
        })) : null,
        // Pass analyzed image contexts to backend for smart selection
        uploadedImageContexts: imageContexts.length > 0 ? imageContexts : null
      }

      console.log('🚀 Sending story generation request with enhanced image data:', {
        uploadedImages: requestData.uploadedImages?.length || 0,
        imageContexts: requestData.uploadedImageContexts?.length || 0,
        hasAnalyzedImages: imageContexts.some(ctx => ctx.isAnalyzed)
      })

      if (inputMethod === 'text') {
        requestData.storyText = storyText.trim()
      } else {
        // For audio input, we need to transcribe first, then use slideshow
        // Convert audio to base64
        const reader = new FileReader()
        const audioBase64 = await new Promise((resolve) => {
          reader.onload = () => {
            const base64 = reader.result.split(',')[1]
            resolve(base64)
          }
          reader.readAsDataURL(audioBlob)
        })
        
        // First transcribe the audio
        const transcriptionResult = await storyAPI.transcribeAudio({ audioData: audioBase64 })
        if (transcriptionResult.success) {
          requestData.storyText = transcriptionResult.transcript
        } else {
          throw new Error('Failed to transcribe audio')
        }
      }

      // Simulate processing steps with enhanced descriptions
      const stepInterval = setInterval(() => {
        setProcessingStep(prev => {
          if (prev < processingSteps.length - 1) {
            return prev + 1
          }
          clearInterval(stepInterval)
          return prev
        })
      }, 2000)

      // Use enhanced scenes generation with smart image integration
      const result = await storyAPI.generateScenes(requestData)
      
      clearInterval(stepInterval)
      setProcessingStep(processingSteps.length - 1)
      
      if (result.success) {
        // Create enhanced slideshow object for frontend
        const slideshow = {
          type: 'slideshow',
          originalText: result.originalText,
          scenes: result.scenes,
          characters: result.characters,
          totalScenes: result.totalScenes,
          hasUploadedImages: result.hasUploadedImages,
          // Enhanced metadata for better tracking
          imageIntegration: {
            uploadedCount: uploadedImages.length,
            contextsAnalyzed: imageContexts.length,
            scenesWithUploads: result.scenes?.filter(scene => scene.usedUploadedImage)?.length || 0
          }
        }
        
        setGeneratedStory(slideshow)
        
        // Enhanced success message with integration info
        if (uploadedImages.length > 0) {
          const usedScenes = slideshow.imageIntegration.scenesWithUploads
          toast.success(`Story generated! ${usedScenes} scenes use your uploaded images with smart context adaptation.`)
        } else {
          toast.success('Story scenes generated successfully!')
        }
      } else {
        throw new Error(result.error || 'Story generation failed')
      }
    } catch (error) {
      console.error('Story generation error:', error)
      setError(error.response?.data?.details || error.message || 'Failed to generate story')
      toast.error('Story generation failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (generatedStory) {
    // Always use VideoLikePlayer for the new experience
    return <VideoLikePlayer presentation={generatedStory} onBack={() => setGeneratedStory(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Create Your Story</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your imagination into a beautiful animated video with AI
          </p>
        </motion.div>

        <div className="card max-w-3xl mx-auto">
          {/* Input Method Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">Choose Your Input Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'text', icon: Type, title: 'Type Story', desc: 'Write your story directly' },
                { id: 'voice', icon: Mic, title: 'Record Voice', desc: 'Speak your story aloud' },
                { id: 'upload', icon: Upload, title: 'Upload Audio', desc: 'Upload an audio file' }
              ].map((method) => {
                const Icon = method.icon
                return (
                  <motion.button
                    key={method.id}
                    onClick={() => setInputMethod(method.id)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      inputMethod === method.id
                        ? 'border-primary-500 bg-primary-50 shadow-lg'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-primary-25'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className={`h-8 w-8 mx-auto mb-3 ${
                      inputMethod === method.id ? 'text-primary-600' : 'text-gray-600'
                    }`} />
                    <h3 className="font-semibold mb-2">{method.title}</h3>
                    <p className="text-sm text-gray-600">{method.desc}</p>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Enhanced Smart Image Upload Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary-600" />
                  Smart Image Integration
                  {uploadedImages.length > 0 && (
                    <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm">
                      {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Upload images to be intelligently integrated into your story scenes
                </p>
              </div>
              <motion.button
                onClick={() => setShowImageUpload(!showImageUpload)}
                className="text-primary-600 hover:text-primary-700 flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles className="h-4 w-4" />
                <span>{showImageUpload ? 'Hide Upload' : 'Add Images'}</span>
              </motion.button>
            </div>

            <AnimatePresence>
              {showImageUpload && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <EnhancedImageUpload
                    uploadedImages={uploadedImages}
                    setUploadedImages={setUploadedImages}
                    onAnalyzeImages={handleImageAnalysis}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick info about image integration - simplified */}
            {uploadedImages.length > 0 && !showImageUpload && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} uploaded
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Interface */}
          <AnimatePresence mode="wait">
            {inputMethod === 'text' && (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="mb-8"
              >
                <label className="block text-lg font-semibold mb-4">Write Your Story</label>
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Once upon a time, in a magical forest far away..."
                  className="textarea-field h-48 text-lg"
                  maxLength={5000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {storyText.length}/5000 characters
                  </span>
                  <span className="text-sm text-gray-500">
                    Estimated reading time: {Math.ceil(storyText.length / 200)} min
                  </span>
                </div>
              </motion.div>
            )}

            {inputMethod === 'voice' && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="mb-8"
              >
                <label className="block text-lg font-semibold mb-4">Record Your Story</label>
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  {!audioBlob ? (
                    <div>
                      <motion.button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 mx-auto ${
                          isRecording 
                            ? 'bg-red-500 hover:bg-red-600 pulse-glow' 
                            : 'bg-primary-500 hover:bg-primary-600'
                        } text-white shadow-lg`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                      </motion.button>
                      
                      <p className="text-lg font-medium mb-2">
                        {isRecording ? 'Recording...' : 'Click to start recording'}
                      </p>
                      
                      {isRecording && (
                        <div className="text-2xl font-mono text-red-600 mb-2">
                          {formatTime(recordingTime)}
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600">
                        Maximum recording time: 5 minutes
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-center space-x-4 mb-4">
                        <motion.button
                          onClick={playAudio}
                          className="btn-primary flex items-center space-x-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isPlaying ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          <span>{isPlaying ? 'Playing...' : 'Play Recording'}</span>
                        </motion.button>
                        
                        <motion.button
                          onClick={resetRecording}
                          className="btn-secondary flex items-center space-x-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <RotateCcw className="h-5 w-5" />
                          <span>Re-record</span>
                        </motion.button>
                      </div>
                      
                      <p className="text-green-600 font-medium">
                        ✓ Recording ready ({formatTime(recordingTime)})
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {inputMethod === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="mb-8"
              >
                <label className="block text-lg font-semibold mb-4">Upload Audio File</label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {audioBlob ? 'Audio file uploaded' : 'Click to upload audio file'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Supports MP3, WAV, M4A files (max 10MB)
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {audioBlob && (
                    <div className="mt-4 flex justify-center space-x-4">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          playAudio()
                        }}
                        className="btn-primary flex items-center space-x-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="h-4 w-4" />
                        <span>Play</span>
                      </motion.button>
                      
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          setAudioBlob(null)
                        }}
                        className="btn-secondary flex items-center space-x-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Remove</span>
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Generation Failed</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Generate Button */}
          <div className="text-center">
            <motion.button
              onClick={generateStory}
              disabled={isProcessing || (!storyText.trim() && !audioBlob)}
              className={`btn-primary text-lg px-8 py-4 flex items-center space-x-3 mx-auto ${
                isProcessing || (!storyText.trim() && !audioBlob)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              whileHover={!isProcessing ? { scale: 1.05 } : {}}
              whileTap={!isProcessing ? { scale: 0.95 } : {}}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating Story...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Story</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Processing Steps - Simplified */}
        {isProcessing && (
          <div className="mt-8 text-center">
            <div className="inline-block p-4 bg-blue-50 rounded-lg shadow">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mr-3"></div>
                <p>Processing your story...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateStoryPage