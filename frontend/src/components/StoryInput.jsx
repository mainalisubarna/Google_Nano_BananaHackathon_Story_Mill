import { useState, useRef } from 'react'
import './StoryInput.css'

const StoryInput = ({ onStorySubmit }) => {
  const [inputMethod, setInputMethod] = useState('text') // 'text' or 'voice'
  const [storyText, setStoryText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const handleTextSubmit = async () => {
    if (!storyText.trim()) return
    
    setIsProcessing(true)
    try {
      onStorySubmit({
        text: storyText,
        method: 'text'
      })
    } catch (error) {
      console.error('Error submitting story:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const loadDemoStory = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('http://localhost:3001/api/story/demo')
      const result = await response.json()
      
      if (result.success) {
        onStorySubmit({
          text: result.story.originalText,
          method: 'demo',
          demoData: result.story
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Demo story error:', error)
      alert('Failed to load demo story. Please try typing or recording your own story.')
    } finally {
      setIsProcessing(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob) => {
    setIsProcessing(true)
    try {
      // For MVP, we'll use browser's Web Speech API for real-time transcription
      // This provides better user experience than server-side processing
      
      // Fallback to server transcription if needed
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')

      const response = await fetch('http://localhost:3001/api/audio/transcribe', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        onStorySubmit({
          text: result.transcript,
          method: 'voice',
          confidence: result.confidence
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Transcription error:', error)
      // Provide a fallback option
      const fallbackText = prompt('Audio transcription failed. Please type your story:')
      if (fallbackText) {
        onStorySubmit({
          text: fallbackText,
          method: 'text'
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="story-input">
      <div className="card">
        <h2>Tell Your Story</h2>
        <p>Choose how you'd like to share your story with StoryMill</p>
        
        <div className="input-method-selector">
          <button 
            className={`method-btn ${inputMethod === 'text' ? 'active' : ''}`}
            onClick={() => setInputMethod('text')}
          >
            ✍️ Type Story
          </button>
          <button 
            className={`method-btn ${inputMethod === 'voice' ? 'active' : ''}`}
            onClick={() => setInputMethod('voice')}
          >
            🎙️ Record Story
          </button>
        </div>
        
        <div className="demo-section">
          <button 
            onClick={loadDemoStory}
            disabled={isProcessing}
            className="btn demo-btn"
          >
            ✨ Try Demo Story
          </button>
          <p className="demo-text">See StoryMill in action with a sample story</p>
        </div>

        {inputMethod === 'text' && (
          <div className="text-input-section">
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="Once upon a time in a quiet village..."
              className="story-textarea"
              rows={8}
            />
            <button 
              onClick={handleTextSubmit}
              disabled={!storyText.trim() || isProcessing}
              className="btn btn-primary"
            >
              {isProcessing ? 'Processing...' : 'Create Visual Story'}
            </button>
          </div>
        )}

        {inputMethod === 'voice' && (
          <div className="voice-input-section">
            <div className="recording-interface">
              <div className={`record-button ${isRecording ? 'recording' : ''}`}>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className="record-btn"
                >
                  {isRecording ? '⏹️' : '🎙️'}
                </button>
              </div>
              <p className="recording-status">
                {isProcessing ? 'Processing audio...' : 
                 isRecording ? 'Recording... Click to stop' : 
                 'Click to start recording'}
              </p>
              {isRecording && (
                <div className="recording-indicator">
                  <div className="pulse"></div>
                </div>
              )}
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing your story...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StoryInput