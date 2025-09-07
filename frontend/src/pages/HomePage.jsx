import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Sparkles, 
  Play, 
  Mic, 
  Image, 
  Video, 
  Wand2, 
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Clock,
  Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../services/api'

const HomePage = () => {
  const [backendStatus, setBackendStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkBackendStatus()
  }, [])

  const checkBackendStatus = async () => {
    try {
      const response = await api.get('/health')
      setBackendStatus(response.data)
    } catch (error) {
      console.error('Backend status check failed:', error)
      toast.error('Backend connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    {
      icon: Mic,
      title: 'Voice to Story',
      description: 'Record your story or type it directly. Our AI understands both.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Wand2,
      title: 'AI Scene Analysis',
      description: 'Automatically breaks your story into cinematic scenes.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Image,
      title: 'Visual Generation',
      description: 'Creates stunning illustrations with character consistency.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Video,
      title: 'Cinematic Videos',
      description: 'Produces 60fps MP4 videos with context-aware transitions.',
      color: 'from-orange-500 to-red-500'
    }
  ]

  const stats = [
    { icon: Users, value: '10K+', label: 'Stories Created' },
    { icon: Clock, value: '2-4min', label: 'Average Processing' },
    { icon: Star, value: '4.9/5', label: 'User Rating' },
    { icon: Zap, value: '60fps', label: 'Video Quality' }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50">
        <div className="absolute inset-0 bg-hero-pattern opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-7xl font-bold mb-6">
                <span className="gradient-text">Transform Stories</span>
                <br />
                <span className="text-gray-800">Into Magic</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                AI-powered visual storytelling platform that turns your words into 
                beautiful animated videos with cinematic transitions and voice narration.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link to="/create">
                  <motion.button
                    className="btn-primary text-lg px-8 py-4 flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Create Your Story</span>
                    <ArrowRight className="h-5 w-5" />
                  </motion.button>
                </Link>
                
                <motion.button
                  className="btn-secondary text-lg px-8 py-4 flex items-center space-x-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => document.getElementById('demo-section').scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="h-5 w-5" />
                  <span>Watch Demo</span>
                </motion.button>
              </div>

              {/* Backend Status Indicator */}
              {!isLoading && (
                <motion.div
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className={`h-2 w-2 rounded-full ${backendStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {backendStatus ? 'System Online' : 'System Offline'}
                  </span>
                  {backendStatus && (
                    <span className="text-xs text-gray-500">
                      v{backendStatus.version}
                    </span>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 opacity-20">
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20">
          <motion.div
            className="w-16 h-16 rounded-full bg-gradient-to-r from-accent-400 to-primary-400"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="gradient-text">Powerful Features</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to create stunning visual stories with AI
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  className="card card-hover text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} text-white mb-6`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="gradient-text">How It Works</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Create beautiful stories in just a few simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Input Your Story',
                description: 'Type your story or record it with your voice. Our AI handles both perfectly.',
                icon: Mic
              },
              {
                step: '02',
                title: 'AI Processing',
                description: 'Watch as AI analyzes your story, creates scenes, and generates stunning visuals.',
                icon: Wand2
              },
              {
                step: '03',
                title: 'Download & Share',
                description: 'Get your beautiful animated video ready to share with the world.',
                icon: Video
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="card text-center">
                    <div className="text-6xl font-bold text-primary-100 mb-4">{item.step}</div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white mb-6">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                  
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ArrowRight className="h-8 w-8 text-primary-300" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo-section" className="py-20 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="gradient-text">See It In Action</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Watch how StoryMill transforms a simple story into a beautiful animated video
            </p>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mb-6">
                <motion.div
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mb-4 mx-auto">
                    <Play className="h-8 w-8 text-primary-600 ml-1" />
                  </div>
                  <p className="text-gray-600 font-medium">Click to watch demo video</p>
                </motion.div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                {['AI Analysis', 'Image Generation', 'Voice Synthesis', 'Video Creation'].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 px-4 py-2 bg-primary-100 rounded-full">
                    <CheckCircle className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-medium text-primary-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 via-secondary-600 to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Ready to Create Magic?
            </h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
              Join thousands of storytellers who are already creating amazing visual stories with StoryMill
            </p>
            
            <Link to="/create">
              <motion.button
                className="bg-white text-primary-600 font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg flex items-center space-x-2 mx-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="h-5 w-5" />
                <span>Start Creating Now</span>
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default HomePage