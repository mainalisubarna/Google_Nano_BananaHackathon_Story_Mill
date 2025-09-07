import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Heart, Github, Twitter, Mail } from 'lucide-react'

const Footer = () => {
  return (
    <motion.footer 
      className="bg-gray-900 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold">StoryMill</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Transform your stories into beautiful animated videos with AI-powered visuals, 
              voice narration, and cinematic transitions. Bring your imagination to life.
            </p>
            <div className="flex space-x-4">
              <motion.a
                href="#"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="h-5 w-5" />
              </motion.a>
              <motion.a
                href="#"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Twitter className="h-5 w-5" />
              </motion.a>
              <motion.a
                href="#"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mail className="h-5 w-5" />
              </motion.a>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">AI Story Analysis</li>
              <li className="hover:text-white transition-colors cursor-pointer">Image Generation</li>
              <li className="hover:text-white transition-colors cursor-pointer">Voice Narration</li>
              <li className="hover:text-white transition-colors cursor-pointer">Video Creation</li>
              <li className="hover:text-white transition-colors cursor-pointer">Character Consistency</li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">Documentation</li>
              <li className="hover:text-white transition-colors cursor-pointer">API Reference</li>
              <li className="hover:text-white transition-colors cursor-pointer">Community</li>
              <li className="hover:text-white transition-colors cursor-pointer">Help Center</li>
              <li className="hover:text-white transition-colors cursor-pointer">Contact Us</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 StoryMill. All rights reserved.
          </p>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <span className="text-gray-400 text-sm">Made with</span>
            <Heart className="h-4 w-4 text-red-500" />
            <span className="text-gray-400 text-sm">for storytellers everywhere</span>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}

export default Footer