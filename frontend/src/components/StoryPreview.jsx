import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Share2,
  Eye,
  Clock,
  Users,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { videoAPI } from '../services/api'

const StoryPreview = ({ story, onBack }) => {
  const [currentScene, setCurrentScene] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const handleDownload = () => {
    if (story.video?.id) {
      const downloadUrl = videoAPI.getDownloadUrl(story.video.id)
      window.open(downloadUrl, '_blank')
      toast.success('Download started!')
    } else {
      toast.error('Video not available for download')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my StoryMill creation!',
          text: story.originalText.substring(0, 100) + '...',
          url: window.location.href
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const playScene = (sceneIndex) => {
    const scene = story.scenes[sceneIndex]
    if (scene.audio?.audioUrl) {
      const audio = new Audio(scene.audio.audioUrl)
      audio.volume = isMuted ? 0 : 0.7
      audio.play()
      setIsPlaying(true)
      audio.onended = () => setIsPlaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <motion.button
            onClick={onBack}
            className="btn-secondary flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Create</span>
          </motion.button>

          <div className="flex items-center space-x-4">
            <motion.button
              onClick={handleShare}
              className="btn-secondary flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </motion.button>

            <motion.button
              onClick={handleDownload}
              className="btn-primary flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="h-5 w-5" />
              <span>Download Video</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Story Title and Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="gradient-text">Your Story is Ready!</span>
          </h1>
          
          <div className="flex flex-wrap justify-center gap-6 text-gray-600">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>{story.scenes?.length || 0} scenes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>{story.video?.totalDuration || 0}s duration</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{Object.keys(story.characters || {}).length} characters</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>60fps HD quality</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Video Preview */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card"
            >
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-6 relative overflow-hidden">
                {story.scenes && story.scenes[currentScene]?.image?.imageUrl ? (
                  <img
                    src={story.scenes[currentScene].image.imageUrl}
                    alt={`Scene ${currentScene + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Video Preview</p>
                    </div>
                  </div>
                )}
                
                {/* Video Controls Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <motion.button
                    onClick={() => playScene(currentScene)}
                    className="w-16 h-16 rounded-full bg-white bg-opacity-90 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? <Pause className="h-8 w-8 text-gray-800" /> : <Play className="h-8 w-8 text-gray-800 ml-1" />}
                  </motion.button>
                </div>
              </div>

              {/* Video Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <motion.button
                    onClick={() => playScene(currentScene)}
                    className="btn-primary flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    <span>{isPlaying ? 'Pause' : 'Play Scene'}</span>
                  </motion.button>

                  <motion.button
                    onClick={() => setIsMuted(!isMuted)}
                    className="btn-secondary p-3"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </motion.button>
                </div>

                {story.video?.downloadUrl && (
                  <motion.a
                    href={videoAPI.getStreamUrl(story.video.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span>Full Video</span>
                  </motion.a>
                )}
              </div>

              {/* Scene Description */}
              {story.scenes && story.scenes[currentScene] && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold mb-2">Scene {currentScene + 1}</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {story.scenes[currentScene].description}
                  </p>
                  
                  {/* Scene Metadata */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {story.scenes[currentScene].mood && (
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                        {story.scenes[currentScene].mood}
                      </span>
                    )}
                    {story.scenes[currentScene].environment && (
                      <span className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm">
                        {story.scenes[currentScene].environment}
                      </span>
                    )}
                    {story.scenes[currentScene].timeOfDay && (
                      <span className="px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm">
                        {story.scenes[currentScene].timeOfDay}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Scene Navigation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card"
            >
              <h3 className="text-xl font-semibold mb-4">Scenes</h3>
              <div className="space-y-3">
                {story.scenes?.map((scene, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setCurrentScene(index)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                      currentScene === index
                        ? 'bg-primary-100 border-2 border-primary-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-3">
                      {scene.image?.imageUrl && (
                        <img
                          src={scene.image.imageUrl}
                          alt={`Scene ${index + 1}`}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Scene {index + 1}</p>
                        <p className="text-xs text-gray-600 truncate">
                          {scene.description.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Characters */}
            {story.characters && Object.keys(story.characters).length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="card"
              >
                <h3 className="text-xl font-semibold mb-4">Characters</h3>
                <div className="space-y-3">
                  {Object.entries(story.characters).map(([name, description], index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-xl">
                      <p className="font-medium capitalize">{name}</p>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Video Info */}
            {story.video && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <h3 className="text-xl font-semibold mb-4">Video Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <span className="font-medium">{story.video.metadata?.format?.toUpperCase() || 'MP4'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resolution:</span>
                    <span className="font-medium">{story.video.metadata?.resolution || '1920x1080'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frame Rate:</span>
                    <span className="font-medium">{story.video.metadata?.fps || 60} fps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{story.video.totalDuration || 0}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {story.video.metadata?.createdAt 
                        ? new Date(story.video.metadata.createdAt).toLocaleDateString()
                        : 'Just now'
                      }
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Original Story Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card mt-8"
        >
          <h3 className="text-xl font-semibold mb-4">Original Story</h3>
          <div className="bg-gray-50 rounded-xl p-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {story.originalText}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default StoryPreview