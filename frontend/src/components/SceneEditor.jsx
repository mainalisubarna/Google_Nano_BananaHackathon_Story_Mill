import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
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
      // First, fetch the image as base64 if it's a URL
      let originalImageBase64 = selectedScene.image.imageUrl;
      
      // If it's not already a base64 string (starts with data:image), fetch it
      if (!originalImageBase64.startsWith('data:image')) {
        try {
          // Get the image from URL and convert to base64
          const imgResponse = await fetch(selectedScene.image.imageUrl);
          const blob = await imgResponse.blob();
          
          // Convert blob to base64
          originalImageBase64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.error("Error converting image to base64:", err);
          throw new Error("Could not process the image for editing");
        }
      }
      
      // Use the correct story edit endpoint with base64 image data
      const response = await fetch('http://localhost:3001/api/story/edit-scene-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalImageBase64: originalImageBase64,
          editPrompt: editPrompt,
          sceneNumber: selectedScene.sceneNumber,
          sceneContext: selectedScene
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to edit scene')
      }

      // Update the scene with new image
      const updatedScenes = generatedScenes.map(scene => 
        scene.sceneNumber === selectedScene.sceneNumber 
          ? { 
              ...scene, 
              image: {
                ...scene.image,
                imageUrl: result.editedImage,
                prompt: result.editPrompt
              }
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
              <div className="relative">
                <img 
                  src={selectedScene.image.imageUrl} 
                  alt={`Scene ${selectedScene.sceneNumber}`}
                />
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                  </div>
                )}
              </div>
              <p>{selectedScene.description}</p>
            </div>
            
            <div className="edit-controls">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (editPrompt.trim() && !isEditing) {
                  handleEditScene();
                }
              }}>
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Describe your changes (e.g., 'Make it nighttime', 'Change dress to red')"
                  className="edit-input"
                  disabled={isEditing}
                />
                <div className="edit-actions">
                  <button 
                    type="button"
                    onClick={() => setSelectedScene(null)}
                    className="btn btn-outline"
                    disabled={isEditing}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!editPrompt.trim() || isEditing}
                    className="btn btn-primary"
                  >
                    {isEditing ? 'Applying...' : 'Apply Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SceneEditor