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
  Share2,
  RotateCcw,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { storyAPI } from '../services/api'

const SlideshowPreview = ({ presentation, onBack }) => {
  const [currentScene, setCurrentScene] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isPreloading, setIsPreloading] = useState(true)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [sceneAudios, setSceneAudios] = useState({}) // Cache for generated audio
  const [preloadedImages, setPreloadedImages] = useState({}) // Cache for preloaded images
  const audioRef = useRef(null)
  const progressInterval = useRef(null)
  const autoAdvanceTimeout = useRef(null)

  const scenes = presentation.scenes || []
  const totalScenes = scenes.length

  // Preload all images for smooth experience
  const preloadImages = useCallback(async () => {
    const imagePromises = scenes.map((scene, index) => {
      return new Promise((resolve) => {
        if (scene.image?.imageUrl) {
          const img = new Image()
          img.onload = () => {
            setPreloadedImages(prev => ({
              ...prev,
              [index]: scene.image.imageUrl
            }))
            resolve(true)
          }
          img.onerror = () => resolve(false)
          img.src = scene.image.imageUrl
        } else {
          resolve(false)
        }
      })
    })

    const results = await Promise.all(imagePromises)
    const loadedCount = results.filter(Boolean).length
    setPreloadProgress((loadedCount / scenes.length) * 100)
    
    if (loadedCount === scenes.length) {
      setIsPreloading(false)
    }
  }, [scenes])

  // Preload audio for all scenes
  const preloadAllAudio = useCallback(async () => {
    const audioPromises = scenes.map(async (scene, index) => {
      if (!scene.text) return null

      try {
        const result = await storyAPI.textToSpeech(scene.text)
        if (result.success) {
          setSceneAudios(prev => ({
            ...prev,
            [index]: result.audioUrl
          }))
          return result.audioUrl
        }
      } catch (error) {
        console.error(`Failed to generate audio for scene ${index}:`, error)
      }
      return null
    })

    await Promise.all(audioPromises)
  }, [scenes])

  // Initialize preloading
  useEffect(() => {
    if (scenes.length > 0) {
      preloadImages()
      // Preload audio in background (optional for smooth experience)
      preloadAllAudio()
    }
  }, [scenes, preloadImages, preloadAllAudio])

  // Get audio for current scene (from cache or generate)
  const getAudioForScene = async (sceneIndex) => {
    const scene = scenes[sceneIndex]
    if (!scene || !scene.text) return null

    // Check if audio already cached
    if (sceneAudios[sceneIndex]) {
      return sceneAudios[sceneIndex]
    }

    // Generate if not cached
    try {
      const result = await storyAPI.textToSpeech(scene.text)
      if (result.success) {
        const audioUrl = result.audioUrl
        setSceneAudios(prev => ({
          ...prev,
          [sceneIndex]: audioUrl
        }))
        return audioUrl
      }
    } catch (error) {
      console.error('Failed to generate audio:', error)
      toast.error('Failed to generate narration')
    }
    
    return null
  }

  // Auto-advance to next scene when audio ends
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      if (currentScene < totalScenes - 1) {
        // Auto-advance to next scene with smooth transition
        setTimeout(() => {
          setCurrentScene(prev => prev + 1)
          setProgress(0)
          // Auto-play next scene if currently playing
          if (isPlaying) {
            setTimeout(() => {
              playPause()
            }, 500)
          }
        }, 300) // Quick transition for video-like experience
      } else {
        // End of slideshow
        setIsPlaying(false)
        setProgress(0)
      }
    }

    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('ended', handleEnded)
      if (autoAdvanceTimeout.current) {
        clearTimeout(autoAdvanceTimeout.current)
      }
    }
  }, [currentScene, totalScenes, isPlaying])

  // Update progress during playback
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100)
        }
      }, 100)
    } else {
      clearInterval(progressInterval.current)
    }

    return () => clearInterval(progressInterval.current)
  }, [isPlaying])

  // Keyboard controls for video-like experience
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isPreloading) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          playPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevScene()
          break
        case 'ArrowRight':
          e.preventDefault()
          nextScene()
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          break
        case 'KeyR':
          e.preventDefault()
          restartSlideshow()
          break
        case 'Escape':
          e.preventDefault()
          onBack()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPreloading, currentScene, totalScenes, isPlaying, isMuted])

  const playPause = async () => {
    if (isPreloading) {
      toast.info('Please wait for content to load...')
      return
    }

    const audio = audioRef.current

    if (isPlaying) {
      // Pause current audio and auto-advance
      if (audio) {
        audio.pause()
      }
      if (autoAdvanceTimeout.current) {
        clearTimeout(autoAdvanceTimeout.current)
      }
      setIsPlaying(false)
    } else {
      // Get and play audio for current scene
      const audioUrl = await getAudioForScene(currentScene)
      
      if (audioUrl && audio) {
        audio.src = audioUrl
        audio.muted = isMuted
        try {
          await audio.play()
          setIsPlaying(true)
        } catch (error) {
          console.error('Failed to play audio:', error)
          toast.error('Failed to play narration')
        }
      } else {
        // Play without audio (silent mode)
        setIsPlaying(true)
        // Auto-advance after 4 seconds if no audio
        autoAdvanceTimeout.current = setTimeout(() => {
          if (currentScene < totalScenes - 1) {
            setCurrentScene(prev => prev + 1)
            setProgress(0)
          } else {
            setIsPlaying(false)
          }
        }, 4000)
      }
    }
  }

  const goToScene = (sceneIndex) => {
    if (sceneIndex >= 0 && sceneIndex < totalScenes) {
      setCurrentScene(sceneIndex)
      setIsPlaying(false)
      setProgress(0)
      
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }

  const nextScene = () => {
    goToScene(currentScene + 1)
  }

  const prevScene = () => {
    goToScene(currentScene - 1)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const restartSlideshow = () => {
    setCurrentScene(0)
    setIsPlaying(false)
    setProgress(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const shareSlideshow = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My StoryMill Slideshow',
        text: presentation.originalText.substring(0, 100) + '...',
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const downloadSlideshow = () => {
    // For now, just show a message about the feature
    toast.success('Download feature coming soon! For now, you can screenshot each scene.')
  }

  // Show preloading screen
  if (isPreloading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8"
          >
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary-500" />
            <h2 className="text-2xl font-bold mb-2">Preparing Your Story</h2>
            <p className="text-gray-400 mb-4">Loading images and generating narration...</p>
            
            {/* Progress bar */}
            <div className="w-64 bg-gray-700 rounded-full h-2 mx-auto">
              <motion.div
                className="bg-primary-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${preloadProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(preloadProgress)}% complete</p>
          </motion.div>
          
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!scenes.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No scenes available</h2>
          <button onClick={onBack} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentSceneData = scenes[currentScene]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Editor</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Scene {currentScene + 1} of {totalScenes}
          </span>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            
            <button
              onClick={shareSlideshow}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Share"
            >
              <Share2 className="h-5 w-5" />
            </button>
            
            <button
              onClick={downloadSlideshow}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>
            
            <button
              onClick={restartSlideshow}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Restart"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Slideshow Area */}
      <div className="flex-1 flex flex-col">
        {/* Scene Display */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-4xl w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ 
                  duration: 0.4, 
                  ease: "easeInOut"
                }}
                className="text-center"
              >
                {/* Scene Image - Video-like presentation */}
                <div className="mb-6 relative">
                  <img
                    src={preloadedImages[currentScene] || currentSceneData.image?.imageUrl || '/placeholder-image.svg'}
                    alt={`Scene ${currentScene + 1}`}
                    className="w-full max-w-4xl max-h-[70vh] mx-auto rounded-lg shadow-2xl object-contain"
                    style={{ 
                      aspectRatio: '16/9',
                      backgroundColor: '#1a1a1a'
                    }}
                  />
                  
                  {/* Scene number indicator */}
                  <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {currentScene + 1} / {totalScenes}
                  </div>
                </div>

                {/* Scene Text - Subtitle style */}
                <div className="bg-black bg-opacity-80 rounded-lg p-4 max-w-4xl mx-auto">
                  <p className="text-white text-lg leading-relaxed text-center">
                    {currentSceneData.text || currentSceneData.description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Audio Player - Dynamic loading */}
        <audio
          ref={audioRef}
          onLoadedData={() => {
            if (audioRef.current) {
              audioRef.current.muted = isMuted
            }
          }}
        />

        {/* Controls */}
        <div className="bg-gray-900 p-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">
              Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Space</kbd> to play/pause, 
              <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs ml-1">←→</kbd> to navigate, 
              <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs ml-1">M</kbd> to mute
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={prevScene}
              disabled={currentScene === 0}
              className="p-3 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipBack className="h-6 w-6" />
            </button>

            <button
              onClick={playPause}
              disabled={isPreloading}
              className="p-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-500 rounded-full text-white transition-colors shadow-lg"
            >
              {isPreloading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </button>

            <button
              onClick={nextScene}
              disabled={currentScene === totalScenes - 1}
              className="p-3 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward className="h-6 w-6" />
            </button>

            <button
              onClick={toggleMute}
              className="p-3 text-gray-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </button>
          </div>

          {/* Scene Navigation */}
          <div className="mt-6 flex justify-center space-x-2">
            {scenes.map((_, index) => (
              <button
                key={index}
                onClick={() => goToScene(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentScene
                    ? 'bg-primary-500'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SlideshowPreview