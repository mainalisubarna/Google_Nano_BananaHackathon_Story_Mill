import { useState, useEffect } from 'react'
import './SceneEditor.css'

const SceneEditor = ({ storyData, scenes, onScenesGenerated, onPreview, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScenes, setGeneratedScenes] = useState([])
  const [selectedScene, setSelectedScene] = useState(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (storyData && generatedScenes.length === 0) {
      if (storyData.method === 'demo' && storyData.demoData) {
        // Use pre-generated demo data
        setGeneratedScenes(storyData.demoData.scenes)
        onScenesGenerated(storyData.demoData.scenes)
      } else {
        generateScenes()
      }
    }
  }, [storyData])

  const generateScenes = async () => {
    setIsGenerating(true)
    try {
      // Use the new complete story generation endpoint
      const response = await fetch('http://localhost:3001/api/story/generate-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyText: storyData.text })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error)
      }

      setGeneratedScenes(result.story.scenes)
      onScenesGenerated(result.story.scenes)
    } catch (error) {
      console.error('Scene generation error:', error)
      alert('Failed to generate scenes. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditScene = async () => {
    if (!selectedScene || !editPrompt.trim()) return
    
    setIsEditing(true)
    try {
      // Use the visual edit endpoint directly
      const response = await fetch('http://localhost:3001/api/visual/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: selectedScene.visualPrompt || selectedScene.enhancedPrompt,
          editPrompt: editPrompt
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error)
      }

      // Update the scene with new image
      const updatedScenes = generatedScenes.map(scene => 
        scene.sceneNumber === selectedScene.sceneNumber 
          ? { 
              ...scene, 
              image: result.image,
              visualPrompt: result.image.prompt
            }
          : scene
      )
      
      setGeneratedScenes(updatedScenes)
      onScenesGenerated(updatedScenes)
      setEditPrompt('')
      setSelectedScene(null)
    } catch (error) {
      console.error('Scene editing error:', error)
      alert('Failed to edit scene. Please try again.')
    } finally {
      setIsEditing(false)
    }
  }

  if (isGenerating) {
    return (
      <div className="scene-editor">
        <div className="card">
          <div className="generating-scenes">
            <div className="spinner"></div>
            <h3>Creating your visual story...</h3>
            <p>Analyzing scenes and generating images</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scene-editor">
      <div className="editor-header">
        <button onClick={onBack} className="btn btn-outline">← Back</button>
        <h2>Edit Your Story Scenes</h2>
        <button 
          onClick={onPreview} 
          className="btn btn-primary"
          disabled={generatedScenes.length === 0}
        >
          Preview Story →
        </button>
      </div>

      <div className="scenes-grid">
        {generatedScenes.map((scene, index) => (
          <div key={scene.sceneNumber} className="scene-card">
            <div className="scene-image">
              <img 
                src={scene.image.imageUrl} 
                alt={`Scene ${scene.sceneNumber}`}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x300?text=Scene+' + scene.sceneNumber
                }}
              />
              <button 
                className="edit-scene-btn"
                onClick={() => setSelectedScene(scene)}
              >
                ✏️ Edit
              </button>
            </div>
            <div className="scene-content">
              <h4>Scene {scene.sceneNumber}</h4>
              <p>{scene.description}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedScene && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h3>Edit Scene {selectedScene.sceneNumber}</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedScene(null)}
              >
                ×
              </button>
            </div>
            
            <div className="current-scene">
              <img 
                src={selectedScene.image.imageUrl} 
                alt={`Scene ${selectedScene.sceneNumber}`}
              />
              <p>{selectedScene.description}</p>
            </div>
            
            <div className="edit-controls">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Describe your changes (e.g., 'Make it nighttime', 'Change dress to red')"
                className="edit-input"
              />
              <div className="edit-actions">
                <button 
                  onClick={() => setSelectedScene(null)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditScene}
                  disabled={!editPrompt.trim() || isEditing}
                  className="btn btn-primary"
                >
                  {isEditing ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SceneEditor