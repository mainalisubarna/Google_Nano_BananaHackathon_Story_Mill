import axios from 'axios'
import { toast } from 'react-hot-toast'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 300000, // 5 minutes for story generation
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Enhanced error handling with debugging info
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    
    // Handle common errors
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.')
    } else if (error.response?.status === 500) {
      toast.error(`Server error: ${error.response?.data?.details || 'Please try again later.'}`)
    } else if (error.response?.status === 404) {
      toast.error(`Endpoint not found: ${error.config?.url}. Check if backend is running on port 3001.`)
    } else if (error.response?.status === 400) {
      const details = error.response?.data?.details || error.response?.data?.error || 'Invalid request'
      toast.error(`Validation error: ${details}`)
    } else if (!error.response) {
      toast.error('Network error. Please check if backend is running on http://localhost:3001')
    } else {
      toast.error(`Error ${error.response?.status}: ${error.response?.data?.error || error.message}`)
    }
    
    return Promise.reject(error)
  }
)

// API methods
export const storyAPI = {
  // Generate scenes with images (NEW APPROACH - no audio in backend)
  generateScenes: async (data) => {
    const response = await api.post('/story/generate-scenes', data)
    return response.data
  },

  // Convert text to speech for frontend narration
  textToSpeech: async (text) => {
    const response = await api.post('/story/text-to-speech', { text })
    return response.data
  },

  // Generate complete story from text or audio (OLD APPROACH)
  generateComplete: async (data) => {
    const response = await api.post('/story/generate-complete', data)
    return response.data
  },

  // Transcribe audio to text
  transcribeAudio: async (data) => {
    const response = await api.post('/story/transcribe', data)
    return response.data
  },

  // Analyze story text only
  analyze: async (storyText) => {
    const response = await api.post('/story/analyze', { storyText })
    return response.data
  },

  // Generate edit prompt
  generateEditPrompt: async (originalPrompt, userEdit) => {
    const response = await api.post('/story/edit-prompt', {
      originalPrompt,
      userEdit
    })
    return response.data
  },

  // Get demo story
  getDemo: async () => {
    const response = await api.get('/story/demo')
    return response.data
  },

  // Get backend status
  getStatus: async () => {
    const response = await api.get('/story/status')
    return response.data
  }
}

export const systemAPI = {
  // Get health status
  getHealth: async () => {
    const response = await api.get('/health')
    return response.data
  },

  // Get system status
  getSystemStatus: async () => {
    const response = await api.get('/system/status')
    return response.data
  },

  // Get performance metrics
  getMetrics: async () => {
    const response = await api.get('/system/metrics')
    return response.data
  },

  // Test backend connection
  testConnection: async () => {
    try {
      const response = await api.get('/health', { timeout: 5000 })
      return { connected: true, data: response.data }
    } catch (error) {
      return { 
        connected: false, 
        error: error.message,
        suggestion: 'Make sure backend is running on http://localhost:3001'
      }
    }
  },

  // Get debug routes
  getDebugRoutes: async () => {
    const response = await api.get('/debug/routes')
    return response.data
  }
}

export const videoAPI = {
  // Get video download URL
  getDownloadUrl: (videoId) => {
    return `${api.defaults.baseURL}/video/download/${videoId}`
  },

  // Get video stream URL
  getStreamUrl: (videoId) => {
    return `${api.defaults.baseURL}/video/stream/${videoId}`
  }
}

export default api