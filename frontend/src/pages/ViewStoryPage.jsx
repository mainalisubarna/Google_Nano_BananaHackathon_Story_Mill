import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import StoryPreview from '../components/StoryPreview'

const ViewStoryPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // In a real app, you would fetch the story by ID from your backend
    // For now, we'll simulate loading and show a placeholder
    const timer = setTimeout(() => {
      setError('Story not found. This feature will be available when stories are saved to a database.')
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Loading Story</h2>
          <p className="text-gray-600">Fetching your story...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card max-w-md mx-auto text-center"
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Story Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <motion.button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center space-x-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <StoryPreview 
      story={story} 
      onBack={() => navigate('/')} 
    />
  )
}

export default ViewStoryPage