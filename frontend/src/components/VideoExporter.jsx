import { useState } from 'react'

const VideoExporter = ({ scenes, onClose }) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const exportAsHTML = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Create HTML video player
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StoryMill Story</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .story-player {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .scene-display {
            position: relative;
            height: 500px;
            background: #000;
        }
        .scene-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .scene-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            padding: 2rem;
            color: white;
        }
        .controls {
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .play-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: #667eea;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
        }
        .progress {
            flex: 1;
            height: 6px;
            background: #ddd;
            border-radius: 3px;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background: #667eea;
            width: 0%;
            transition: width 0.3s ease;
        }
        .scene-info {
            font-size: 0.9rem;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="story-player">
        <div class="scene-display">
            <img id="sceneImage" class="scene-image" src="${scenes[0]?.image?.imageUrl || ''}" alt="Story Scene">
            <div class="scene-overlay">
                <p id="sceneText">${scenes[0]?.description || ''}</p>
            </div>
        </div>
        <div class="controls">
            <button id="playBtn" class="play-btn">▶️</button>
            <div class="progress">
                <div id="progressBar" class="progress-bar"></div>
            </div>
            <div class="scene-info">
                <span id="sceneCounter">Scene 1 of ${scenes.length}</span>
            </div>
        </div>
    </div>

    <script>
        const scenes = ${JSON.stringify(scenes.map(scene => ({
          imageUrl: scene.image?.imageUrl || scene.imageUrl,
          description: scene.description,
          duration: (scene.duration || 4) * 1000
        })))};
        
        let currentScene = 0;
        let isPlaying = false;
        let playTimer = null;
        
        const playBtn = document.getElementById('playBtn');
        const sceneImage = document.getElementById('sceneImage');
        const sceneText = document.getElementById('sceneText');
        const progressBar = document.getElementById('progressBar');
        const sceneCounter = document.getElementById('sceneCounter');
        
        function playStory() {
            if (isPlaying) {
                stopStory();
                return;
            }
            
            isPlaying = true;
            playBtn.textContent = '⏸️';
            playScene(currentScene);
        }
        
        function playScene(index) {
            if (index >= scenes.length) {
                stopStory();
                return;
            }
            
            currentScene = index;
            const scene = scenes[index];
            
            sceneImage.src = scene.imageUrl;
            sceneText.textContent = scene.description;
            sceneCounter.textContent = \`Scene \${index + 1} of \${scenes.length}\`;
            
            // Animate progress bar
            progressBar.style.width = '0%';
            setTimeout(() => {
                progressBar.style.width = '100%';
                progressBar.style.transition = \`width \${scene.duration}ms linear\`;
            }, 100);
            
            playTimer = setTimeout(() => {
                if (isPlaying) {
                    playScene(index + 1);
                }
            }, scene.duration);
        }
        
        function stopStory() {
            isPlaying = false;
            playBtn.textContent = '▶️';
            if (playTimer) {
                clearTimeout(playTimer);
            }
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
        }
        
        playBtn.addEventListener('click', playStory);
        
        // Auto-play on load
        setTimeout(() => {
            playStory();
        }, 1000);
    </script>
</body>
</html>`;

      setExportProgress(50)

      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `storymill_story_${Date.now()}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportProgress(100)
      
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export story')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="video-exporter-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Export Your Story</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="export-options">
          <div className="export-option">
            <h4>📱 Interactive HTML Story</h4>
            <p>Creates a self-contained HTML file that plays your story with automatic scene transitions.</p>
            <button 
              onClick={exportAsHTML}
              disabled={isExporting}
              className="btn btn-primary"
            >
              {isExporting ? 'Exporting...' : 'Export as HTML'}
            </button>
          </div>
          
          {isExporting && (
            <div className="export-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <p>Exporting story... {exportProgress}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoExporter