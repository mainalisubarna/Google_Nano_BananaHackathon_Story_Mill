import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  ArrowLeft,
  Download,
  Edit3,
  MessageCircle,
  Loader2,
  Check,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { storyAPI } from '../services/api'

const VideoLikePlayer = ({ presentation, onBack }) => {
  const [currentScene, setCurrentScene] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [sceneAudios, setSceneAudios] = useState({})
  const [audioDurations, setAudioDurations] = useState({}) // Track audio durations
  const [currentAudioDuration, setCurrentAudioDuration] = useState(6000) // Default 6 seconds
  // AI Chatbot and editing states
  const [isEditMode, setIsEditMode] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editHistory, setEditHistory] = useState({})
  const [showChatBot, setShowChatBot] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', message: 'Hi there! I can help you with your story. You can ask me questions about the plot, characters, or suggest edits for this scene.' },
    { sender: 'ai', message: 'For example, you can ask: "Tell me more about this scene", "What happens next in the story?", or "Edit this image to add more detail".' }
  ])
  // Local state for scenes to handle updates
  const [localScenes, setLocalScenes] = useState(presentation.scenes || [])
  // State to track image updates and force re-renders
  const [imageUpdateCount, setImageUpdateCount] = useState(0)
  // Smooth transition states
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [nextSceneIndex, setNextSceneIndex] = useState(null)
  
  const audioRef = useRef(null)
  const progressInterval = useRef(null)
  const autoAdvanceTimeout = useRef(null)
  const sceneRef = useRef(null)

  // Use local scenes instead of presentation.scenes
  const scenes = localScenes
  const totalScenes = scenes.length
  const currentSceneData = scenes[currentScene] || {}

  // Sync local scenes when presentation changes
  useEffect(() => {
    setLocalScenes(presentation.scenes || [])
    
    // Check for scenes missing images and force regeneration
    if (presentation.scenes) {
      const scenesWithoutImages = presentation.scenes.filter((scene, index) => !scene.image?.imageUrl)
      if (scenesWithoutImages.length > 0) {
        console.log(`⚠️ Found ${scenesWithoutImages.length} scenes without images`)
        // Force refresh after a delay to allow initial loading
        setTimeout(() => {
          setImageUpdateCount(prev => prev + 1)
        }, 1000)
      }
    }
  }, [presentation.scenes])

  // Ensure currentScene stays within bounds
  useEffect(() => {
    if (currentScene >= totalScenes && totalScenes > 0) {
      setCurrentScene(totalScenes - 1)
      setIsPlaying(false)
    }
  }, [currentScene, totalScenes])

  // Generate audio for current scene
  const generateAudioForScene = async (sceneIndex) => {
    if (sceneAudios[sceneIndex]) return sceneAudios[sceneIndex]
    
    try {
      setIsLoading(true)
      const scene = scenes[sceneIndex]
      // Use narrationText if available, otherwise fallback to scene description
      const narrationText = scene.text || scene.description || ''
      const response = await storyAPI.textToSpeech(narrationText)
      
      if (response.success && response.audioUrl) {
        // Store the audio URL and duration
        setSceneAudios(prev => ({
          ...prev,
          [sceneIndex]: response.audioUrl
        }))
        
        // Store the duration (convert seconds to milliseconds, with minimum 6 seconds)
        const durationMs = Math.max((response.duration || 6) * 1000, 6000)
        setAudioDurations(prev => ({
          ...prev,
          [sceneIndex]: durationMs
        }))
        
        // Set current audio duration if it's the current scene
        if (sceneIndex === currentScene) {
          setCurrentAudioDuration(durationMs)
        }
        
        return response.audioUrl
      } else {
        console.error('Failed to generate audio:', response)
        toast.error('Failed to generate audio')
      }
    } catch (error) {
      console.error('Audio generation error:', error)
      toast.error('Audio generation error')
    } finally {
      setIsLoading(false)
    }
    
    return null
  }

  // Load audio for current scene and preload next scene's audio
  useEffect(() => {
    // Don't load audio if we're transitioning - wait until transition completes
    if (isTransitioning) return
    
    const loadAudio = async () => {
      // Generate audio for current scene
      const audioUrl = await generateAudioForScene(currentScene)
      
      // Set the current audio duration
      if (audioDurations[currentScene]) {
        setCurrentAudioDuration(audioDurations[currentScene])
      }
      
      // If we have an audio element and URL, load it
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl
        audioRef.current.load()
      }
      
      // Preload next scene's audio if available
      if (currentScene + 1 < totalScenes) {
        generateAudioForScene(currentScene + 1)
      }
    }
    
    loadAudio()
  }, [currentScene, isTransitioning, totalScenes])

  // Toggle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio()
      clearInterval(progressInterval.current)
      clearTimeout(autoAdvanceTimeout.current)
      setIsPlaying(false)
    } else {
      playAudio()
      setIsPlaying(true)
    }
  }

  // Play audio for current scene
  const playAudio = () => {
    if (audioRef.current && sceneAudios[currentScene]) {
      audioRef.current.play().catch(err => {
        console.error('Audio playback error:', err)
        // Continue with visual-only playback if audio fails
        startVisualPlayback()
      })
    } else {
      // No audio available, use visual-only playback
      startVisualPlayback()
    }
  }

  // Start visual playback (progress bar animation) when no audio available
  const startVisualPlayback = () => {
    // Clear any existing intervals first
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }
    
    // Initialize progress to exactly 0
    setProgress(0)
    
    // Add a small delay before starting the timer to ensure state is updated
    setTimeout(() => {
      // Store the start time for scene duration tracking
      window.sceneStartTime = Date.now()
      
      // Use a timer to update progress - with fixed start reference point
      progressInterval.current = setInterval(() => {
        const elapsed = Date.now() - window.sceneStartTime
        const sceneDuration = audioDurations[currentScene] || currentAudioDuration
        const progressPercent = Math.min((elapsed / sceneDuration) * 100, 100)
        setProgress(progressPercent)
      }, 100) // Slightly longer interval for better performance
    }, 50) // Small delay to ensure DOM updates
    
    // Set timeout to advance to next scene
    const sceneDuration = audioDurations[currentScene] || currentAudioDuration
    autoAdvanceTimeout.current = setTimeout(() => {
      autoAdvanceToNext()
    }, sceneDuration)
  }

  // Auto advance to next scene with transition effect
  const autoAdvanceToNext = () => {
    if (currentScene < totalScenes - 1) {
      // Set transition states
      setIsTransitioning(true)
      setNextSceneIndex(currentScene + 1)
      
      // After transition animation completes, actually change scene
      setTimeout(() => {
        setCurrentScene(prev => {
          const next = prev + 1
          if (next < totalScenes) {
            return next
          }
          return prev
        })
        setIsTransitioning(false)
        setNextSceneIndex(null)
      }, 800) // Duration matches animation time
    } else {
      // End of presentation
      setProgress(100)
      setIsPlaying(false)
      clearInterval(progressInterval.current)
    }
  }

  // Pause audio playback
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    
    clearInterval(progressInterval.current)
    clearTimeout(autoAdvanceTimeout.current)
  }

  // Go to a specific scene
  const goToScene = (sceneIndex) => {
    if (sceneIndex === currentScene) return
    
    pauseAudio()
    setCurrentScene(sceneIndex)
    setProgress(0)
    
    if (isPlaying) {
      // Small delay before starting the new scene
      setTimeout(() => {
        playAudio()
      }, 100)
    }
  }

  const previousScene = () => {
    if (currentScene > 0) {
      goToScene(currentScene - 1)
    }
  }

  const nextScene = () => {
    if (currentScene < totalScenes - 1) {
      goToScene(currentScene + 1)
    }
  }
  
  // AI Chat and Image Editing
  const handleImageEdit = async () => {
    if (!editPrompt.trim()) {
      toast.error('Please enter a message or edit instruction')
      return
    }

    // Add user message to chat
    const userMessage = editPrompt;
    setChatMessages(prev => [...prev, { sender: 'user', message: userMessage }]);
    setEditPrompt('');

    // Determine if this is a chat question or an image edit request
    const isEditRequest = userMessage.toLowerCase().includes('edit') || 
                          userMessage.toLowerCase().includes('change') ||
                          userMessage.toLowerCase().includes('modify') ||
                          userMessage.toLowerCase().includes('update') ||
                          userMessage.toLowerCase().includes('make') ||
                          userMessage.toLowerCase().includes('add');

    if (!isEditRequest) {
      // Handle as a chat message
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        message: `I'd be happy to chat about the story! This scene shows ${currentSceneData.description || 'your story in progress'}. What would you like to know about it?` 
      }]);
      return;
    }

    setIsEditing(true);
    
    try {
      const currentImage = currentSceneData.image?.imageUrl
      if (!currentImage) {
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          message: "I'm sorry, but I can't find an image to edit for this scene." 
        }]);
        return
      }

      // Convert image to base64 for editing
      console.log('🔄 Converting image to base64 for editing...')
      
      // Add AI processing message
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        message: "I'm working on editing this image according to your request. Please wait a moment..." 
      }]);
      
      // Check if the image is already a data URL
      let base64
      if (currentImage.startsWith('data:')) {
        console.log('✅ Image is already a data URL, using directly')
        base64 = currentImage
      } else {
        console.log('🌐 Fetching image from URL and converting to base64...')
        const response = await fetch(currentImage)
        const blob = await response.blob()
        base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      }

      console.log('📝 Sending edit request with prompt:', userMessage)

      // Call AI editing API
      const editResult = await storyAPI.editSceneImage({
        originalImageBase64: base64,
        editPrompt: userMessage,
        sceneNumber: currentScene + 1,
        sceneContext: {
          sceneNumber: currentScene + 1,
          setting: currentSceneData.setting,
          characters: currentSceneData.characters,
          mood: currentSceneData.mood,
          timeOfDay: currentSceneData.timeOfDay
        }
      })

      console.log('✅ Edit result received:', editResult)

      // Update local scenes with the edited image
      setLocalScenes(prevScenes => {
        const updatedScenes = [...prevScenes]
        updatedScenes[currentScene] = {
          ...updatedScenes[currentScene],
          image: {
            ...updatedScenes[currentScene].image,
            imageUrl: editResult.editedImage,
            // Add timestamp to force refresh
            lastModified: Date.now()
          }
        }
        console.log('🔄 Updated local scenes with new image')
        console.log('🔍 New image URL:', editResult.editedImage?.substring(0, 50) + '...')
        console.log('🔍 Scene data after update:', updatedScenes[currentScene])
        return updatedScenes
      })

      // Force re-render by incrementing counter
      setImageUpdateCount(prev => prev + 1)

      // Additional force refresh after a short delay
      setTimeout(() => {
        setImageUpdateCount(prev => prev + 1)
        console.log('🔄 Additional refresh triggered')
      }, 100)

      // Save edit history
      setEditHistory(prev => ({
        ...prev,
        [currentScene]: [
          ...(prev[currentScene] || []),
          {
            editPrompt: userMessage,
            originalImage: currentImage,
            editedImage: editResult.editedImage,
            timestamp: new Date().toISOString()
          }
        ]
      }))

      // Add success message to chat
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        message: "I've successfully edited the image according to your request. The changes should be visible now." 
      }]);
      
      toast.success('Image edited successfully! The new image should appear now.')

    } catch (error) {
      console.error('Edit error:', error)
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        message: `I'm sorry, I couldn't process that edit request: ${error.message || 'Unknown error'}. Please try again with a different request.` 
      }]);
      toast.error('Failed to edit image: ' + error.message)
    } finally {
      setIsEditing(false)
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger keyboard shortcuts if user is typing in an input field
      const activeElement = document.activeElement
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true'
      )
      
      if (isTyping) {
        console.log('🚫 User is typing, ignoring keyboard shortcuts')
        return
      }
      
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowLeft') {
        previousScene()
      } else if (e.key === 'ArrowRight') {
        nextScene()
      } else if (e.key === 'Escape') {
        setIsEditMode(false)
        setShowChatBot(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, currentScene])

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isPlaying && totalScenes > 0 && window.location.hash !== '#autoplay=false') {
        togglePlay()
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInterval(progressInterval.current)
      clearTimeout(autoAdvanceTimeout.current)
    }
  }, [])

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
    }
    setIsMuted(!isMuted)
  }
  
  // Download story as video
  const downloadStoryVideo = async () => {
    try {
      toast.loading('Preparing your video for download... This may take a few seconds')
      
      // Show the 3 second dummy progress
      setTimeout(() => {
        toast.loading('Rendering scenes (25%)...')
      }, 3000)
      
      // Add 3 more seconds of progress
      setTimeout(() => {
        toast.loading('Processing audio (50%)...')
      }, 6000)
      
      // Add 3 more seconds of progress
      setTimeout(() => {
        toast.loading('Finalizing video (75%)...')
      }, 9000)
      
      // Call the API to create the video
      const response = await storyAPI.exportStoryVideo({
        storyId: presentation.id,
        title: presentation.title || 'StoryMill Video',
        scenes: localScenes
      })
      
      toast.dismiss()
      
      if (response.success && response.videoUrl) {
        // Create an anchor element and trigger download
        const downloadLink = document.createElement('a')
        downloadLink.href = response.videoUrl
        downloadLink.download = `${presentation.title || 'StoryMill-Presentation'}.zip`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        
        toast.success('Story presentation downloaded successfully!')
        
        // Open the presentation in a new tab
        const presentationUrl = response.videoUrl.replace('/download/', '/view/')
        window.open(presentationUrl, '_blank')
      } else {
        throw new Error(response.message || 'Failed to create presentation')
      }
    } catch (error) {
      console.error('Video download error:', error)
      toast.error(`Failed to download video: ${error.message}`)
      toast.dismiss()
    }
  }

  // Render component
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Create
        </button>
        
        <h1 className="text-2xl font-bold text-center flex-1">
          {presentation.title || 'StoryMill Video'}
        </h1>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-3 rounded-lg transition-all duration-200 ${
              isEditMode 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/50' 
                : 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/25 border-2 border-orange-400/50'
            }`}
            title="AI Image Editor - Click to edit any scene"
          >
            <Edit3 className="w-5 h-5" />
            {!isEditMode && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                !
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowChatBot(!showChatBot)}
            className={`p-3 rounded-lg transition-all duration-200 relative ${
              showChatBot 
                ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25 ring-2 ring-green-400/50' 
                : 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25 border-2 border-purple-400/50'
            }`}
            title="AI Chat Assistant - Ask questions about your story"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          
          <button
            className="p-3 rounded-lg transition-all duration-200 bg-gray-600 hover:bg-gray-700 text-white"
            title="Download Video (Coming Soon)"
            onClick={() => downloadStoryVideo()}
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="relative max-w-4xl w-full mx-auto">
          {/* Video Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene + imageUpdateCount}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-video bg-gradient-to-b from-gray-800 to-black rounded-xl overflow-hidden shadow-2xl"
              ref={sceneRef}
            >
              {/* Scene Image */}
              {currentSceneData.image?.imageUrl && (
                <motion.img
                  src={currentSceneData.image.imageUrl}
                  alt={`Scene ${currentScene + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 3 }}
                  onError={(e) => {
                    console.error('❌ Image failed to load:', e)
                    // Set a placeholder or show error state
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlLW9mZiI+PHBhdGggZD0iTTE4IDE1LjQxNWwtNS41ODktNS41ODktNC40MTEgNC40MTEtMi0yTDQgMTQuNDE1Ii8+PHBhdGggZD0iTTIwLjEyMSAxOC4xMjFhMyAzIDAgMCAxLTEuOTU5Ljg3OUg1LjgzOGEzIDMgMCAxIDEgMC02aDEwLjMyNE0yMC4xMjEgMTguMTIxQTMgMyAwIDAgMCAyMiAxNi4wMlYxMGMwLTEuNjYtMS4zNC0zLTMtM2gtMWE0IDQgMCAwIDAtMyAzIi8+PHBhdGggZD0iTTIgMiAyMiAyMiIvPjwvc3ZnPg=='
                  }}
                />
              )}
              
              {/* Loading Placeholder */}
              {!currentSceneData.image?.imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-4 mx-auto"></div>
                    <p className="text-gray-300">Loading scene...</p>
                  </div>
                </div>
              )}
              
              {/* Overlay with Scene Info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                      Scene {currentScene + 1} of {totalScenes}
                    </div>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {currentSceneData.fromUserUpload && (
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span>📷</span>
                        <span>Your Image</span>
                      </div>
                    )}
                    {currentSceneData.usedUploadedImage && (
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span>✨</span>
                        <span>Smart Edit</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-300 mt-1">
                  {currentSceneData.setting} • {currentSceneData.mood}
                </p>
                {currentSceneData.image?.originalImageIndex !== undefined && (
                  <p className="text-xs text-purple-300 mt-1">
                    Using uploaded image #{currentSceneData.image.originalImageIndex + 1}
                  </p>
                )}
                {isPlaying && audioDurations[currentScene] && (
                  <p className="text-xs text-blue-300 mt-1">
                    {Math.ceil((audioDurations[currentScene] * (100 - progress)) / 100000)}s remaining
                  </p>
                )}
                
                <div className="mt-auto">
                  <p className="text-lg font-medium drop-shadow-md">
                    {currentSceneData.text || currentSceneData.description}
                  </p>
                </div>
              </div>
              
              {/* Edit Mode Overlay */}
              {isEditMode && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 w-full max-w-md mx-4">
                    <h3 className="text-xl font-bold mb-4 text-center">Edit This Scene</h3>
                    <div className="space-y-4">
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Describe what you want to change... (e.g., 'change the hat color to red', 'make the background darker')"
                        className="w-full h-24 p-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:border-blue-400 focus:outline-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleImageEdit}
                          disabled={isEditing || !editPrompt.trim()}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {isEditing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Editing...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Apply Edit
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setIsEditMode(false)}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scene Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                <motion.div
                  className="h-full bg-white"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Smooth Transition Overlay */}
          <AnimatePresence>
            {isTransitioning && nextSceneIndex !== null && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute inset-0 aspect-video bg-black/20 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.5, opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-3 mb-4 mx-auto w-12 h-12 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  </motion.div>
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="text-lg font-medium text-white mb-1"
                  >
                    Scene {nextSceneIndex + 1}
                  </motion.p>
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-sm text-gray-200 opacity-80"
                  >
                    {scenes[nextSceneIndex]?.setting || 'Loading next scene...'}
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Video Controls */}
      <div className="relative z-10 p-6 bg-black/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          {/* Scene Timeline */}
          <div className="flex items-center gap-2 mb-4">
            {scenes.map((_, index) => (
              <button
                key={index}
                onClick={() => goToScene(index)}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  index === currentScene
                    ? 'bg-white'
                    : index < currentScene
                    ? 'bg-blue-400'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={previousScene}
              disabled={currentScene === 0}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlay}
              className="p-4 rounded-full bg-white text-black hover:bg-gray-100 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
            
            <button
              onClick={nextScene}
              disabled={currentScene === totalScenes - 1}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          {/* Audio Control */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Audio Player (Hidden) */}
      <audio
        ref={audioRef}
        className="hidden"
        autoPlay={isPlaying}
        muted={isMuted}
        onTimeUpdate={(e) => {
          // Update progress based on audio current time
          if (e.target.duration) {
            const progressPercent = (e.target.currentTime / e.target.duration) * 100
            setProgress(progressPercent)
          }
        }}
        onLoadedMetadata={() => {
          console.log('🔊 Audio metadata loaded')
          if (audioRef.current && audioRef.current.duration) {
            // Update the current audio duration based on the actual audio file
            const durationMs = audioRef.current.duration * 1000
            setCurrentAudioDuration(Math.max(durationMs, 6000)) // Minimum 6 seconds
            console.log(`🕒 Audio duration: ${durationMs}ms`)
          }
        }}
        onCanPlay={() => {
          console.log('🎵 Audio can play now')
        }}
        onPlay={() => {
          console.log('▶️ Audio playback started')
        }}
        onPause={() => {
          console.log('⏸️ Audio playback paused')
        }}
        onError={(e) => {
          console.error('❌ Audio error:', e.target.error)
          toast.error('Audio playback error occurred')
        }}
        onEnded={() => {
          console.log('🏁 Audio playback finished')
          // Audio finished, but respect minimum scene duration
          const elapsed = Date.now() - (window.sceneStartTime || Date.now())
          const minSceneDuration = 6000 // Minimum 6 seconds per scene
          
          if (elapsed >= minSceneDuration) {
            // Enough time has passed, advance immediately
            clearInterval(progressInterval.current)
            clearTimeout(autoAdvanceTimeout.current)
            setProgress(100)
            setTimeout(() => {
              autoAdvanceToNext()
            }, 300)
          } else {
            // Audio ended too early, let the backup timer handle it
            console.log(`⏰ Audio ended early (${elapsed}ms), waiting for minimum duration (${minSceneDuration}ms)`)
          }
        }}
        preload="auto"
      />
      
      {/* Chat Bot Sidebar */}
      {showChatBot && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="absolute right-6 top-0 bottom-0 w-80 bg-black/80 backdrop-blur-md rounded-xl p-4 overflow-hidden z-40"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Story Chat</h3>
              <button
                onClick={() => setShowChatBot(false)}
                className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors duration-200 flex items-center justify-center"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 bg-white/5 rounded-lg p-3 mb-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="text-center text-sm text-gray-400">
                  Chat with AI about your story or ask for help.
                </div>
                
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index}
                    className={msg.sender === 'ai' 
                      ? "bg-blue-500/20 rounded-lg p-3 text-sm" 
                      : "bg-white/10 rounded-lg p-3 text-sm"
                    }
                  >
                    <p className={`font-medium mb-1 ${msg.sender === 'ai' ? 'text-blue-300' : 'text-purple-300'}`}>
                      {msg.sender === 'ai' ? 'StoryMill AI' : 'You'}
                    </p>
                    <p>{msg.message}</p>
                    {msg.list && (
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {msg.list.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Type your message or edit request here..."
                className="w-full h-24 p-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:border-blue-400 focus:outline-none"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={handleImageEdit}
                  disabled={isEditing || !editPrompt.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Apply Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/80 rounded-xl p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-lg">Processing...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoLikePlayer
