import React, { useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { storyAPI } from '../services/api'

const AudioTestComponent = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [testText, setTestText] = useState('Hello, this is a test of the text to speech system.')
  const audioRef = useRef(null)

  const testAudio = async () => {
    setIsLoading(true)
    try {
      console.log('🧪 Testing audio generation with text:', testText)
      const response = await storyAPI.textToSpeech(testText)
      console.log('🧪 Audio response:', response)
      
      if (response.success && response.audioUrl) {
        setAudioUrl(response.audioUrl)
        toast.success('Audio generated successfully!')
        
        // Auto-play the audio
        if (audioRef.current) {
          audioRef.current.src = response.audioUrl
          audioRef.current.play().catch(error => {
            console.error('Playback failed:', error)
            toast.error('Playback failed: ' + error.message)
          })
        }
      } else {
        toast.error('Audio generation failed')
      }
    } catch (error) {
      console.error('Audio test error:', error)
      toast.error('Audio test failed: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play().catch(error => {
        console.error('Playback failed:', error)
        toast.error('Playback failed: ' + error.message)
      })
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Audio Test Component</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Text:</label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            rows={3}
          />
        </div>
        
        <button
          onClick={testAudio}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Generating Audio...' : 'Test Audio Generation'}
        </button>
        
        {audioUrl && (
          <div className="space-y-2">
            <button
              onClick={playAudio}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Play Generated Audio
            </button>
            
            <div className="text-xs text-gray-600 break-all">
              Audio URL: {audioUrl.substring(0, 100)}...
            </div>
          </div>
        )}
      </div>
      
      <audio
        ref={audioRef}
        onLoadedMetadata={() => console.log('🎵 Test audio loaded')}
        onPlay={() => console.log('▶️ Test audio playing')}
        onError={(e) => console.error('❌ Test audio error:', e.target.error)}
        onEnded={() => console.log('🏁 Test audio ended')}
      />
    </div>
  )
}

export default AudioTestComponent
