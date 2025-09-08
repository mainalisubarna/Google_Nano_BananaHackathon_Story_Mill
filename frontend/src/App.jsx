import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CreateStoryPage from './pages/CreateStoryPage'
import ViewStoryPage from './pages/ViewStoryPage'
import AboutPage from './pages/AboutPage'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateStoryPage />} />
          <Route path="/story/:id" element={<ViewStoryPage />} />
          {/* <Route path="/about" element={<AboutPage />} /> */}
        </Routes>
      </motion.main>

      <Footer />
    </div>
  )
}

export default App