import React from 'react'
import { motion } from 'framer-motion'
import { 
  Sparkles, 
  Brain, 
  Palette, 
  Music, 
  Video, 
  Zap,
  Heart,
  Users,
  Globe,
  Award,
  Target,
  Lightbulb
} from 'lucide-react'

const AboutPage = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced AI understands your story context, mood, and characters to create perfect scenes.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Palette,
      title: 'Visual Generation',
      description: 'Creates stunning, consistent artwork using state-of-the-art image generation technology.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Music,
      title: 'Audio Synthesis',
      description: 'Generates natural voice narration and contextual ambient sounds for immersive storytelling.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Video,
      title: 'Cinematic Production',
      description: 'Produces professional 60fps videos with context-aware transitions and effects.',
      color: 'from-orange-500 to-red-500'
    }
  ]

  const stats = [
    { icon: Users, value: '10,000+', label: 'Stories Created' },
    { icon: Globe, value: '50+', label: 'Countries' },
    { icon: Award, value: '4.9/5', label: 'User Rating' },
    { icon: Zap, value: '2-4min', label: 'Avg Processing' }
  ]

  const team = [
    {
      name: 'AI Research Team',
      role: 'Story Analysis & Generation',
      description: 'Developing cutting-edge AI models for story understanding and scene generation.'
    },
    {
      name: 'Visual Arts Team',
      role: 'Image Generation & Design',
      description: 'Creating beautiful, consistent artwork and visual storytelling experiences.'
    },
    {
      name: 'Audio Engineering',
      role: 'Voice & Sound Design',
      description: 'Crafting immersive audio experiences with natural voice synthesis and ambient sounds.'
    },
    {
      name: 'Video Production',
      role: 'Cinematic Technology',
      description: 'Building advanced video generation with context-aware transitions and effects.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              <span className="gradient-text">About StoryMill</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto">
              We're revolutionizing storytelling by combining the power of AI with human creativity 
              to transform words into beautiful, cinematic experiences.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="card max-w-4xl mx-auto text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
                <Sparkles className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              To democratize visual storytelling by making it accessible to everyone, regardless of 
              technical skills or artistic ability. We believe every story deserves to be told 
              beautifully, and every storyteller deserves the tools to bring their imagination to life.
            </p>
          </motion.div>
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white mb-4">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="gradient-text">Cutting-Edge Technology</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powered by the latest advances in artificial intelligence and creative technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  className="card card-hover"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} text-white mb-6`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="gradient-text">The Magic Behind StoryMill</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A sophisticated pipeline that transforms your words into cinematic experiences
            </p>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                step: '01',
                title: 'Story Understanding',
                description: 'Our AI analyzes your story to understand characters, plot, mood, and setting. It identifies key scenes and emotional beats.',
                icon: Brain,
                details: ['Natural language processing', 'Character extraction', 'Mood analysis', 'Scene segmentation']
              },
              {
                step: '02',
                title: 'Visual Creation',
                description: 'Advanced image generation creates stunning, consistent artwork for each scene while maintaining character continuity.',
                icon: Palette,
                details: ['Character consistency', 'Style coherence', 'Scene composition', 'Artistic enhancement']
              },
              {
                step: '03',
                title: 'Audio Production',
                description: 'Natural voice synthesis and contextual ambient sounds create an immersive audio experience.',
                icon: Music,
                details: ['Voice narration', 'Ambient sounds', 'Audio mixing', 'Contextual effects']
              },
              {
                step: '04',
                title: 'Video Assembly',
                description: 'Context-aware transitions and professional editing create a cinematic 60fps video experience.',
                icon: Video,
                details: ['Smart transitions', '60fps rendering', 'Professional editing', 'HD quality output']
              }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={index}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <div className="card">
                      <div className="flex items-center mb-6">
                        <div className="text-6xl font-bold text-primary-100 mr-4">{item.step}</div>
                        <div className="p-3 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
                          <Icon className="h-8 w-8" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-semibold mb-4">{item.title}</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">{item.description}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {item.details.map((detail, detailIndex) => (
                          <div key={detailIndex} className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                            <span className="text-sm text-gray-600">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <div className="aspect-square bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center">
                      <Icon className="h-24 w-24 text-primary-600" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="gradient-text">Our Expert Teams</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Passionate experts working together to push the boundaries of AI-powered storytelling
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={index}
                className="card card-hover text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {member.name.split(' ').map(word => word[0]).join('')}
                </div>
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-primary-600 font-medium mb-4">{member.role}</p>
                <p className="text-gray-600">{member.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 via-secondary-600 to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-8">
              <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Target className="h-12 w-12" />
              </div>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Our Vision</h2>
            <p className="text-xl mb-8 max-w-4xl mx-auto opacity-90 leading-relaxed">
              We envision a world where every person can be a filmmaker, where stories transcend 
              language barriers through visual beauty, and where technology amplifies human creativity 
              rather than replacing it. StoryMill is just the beginning of this journey.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              {[
                { icon: Heart, title: 'Accessibility', desc: 'Making visual storytelling accessible to everyone' },
                { icon: Lightbulb, title: 'Innovation', desc: 'Pushing the boundaries of creative technology' },
                { icon: Globe, title: 'Global Impact', desc: 'Connecting cultures through visual stories' }
              ].map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={index}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="opacity-90">{item.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage