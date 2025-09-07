# StoryMill Project Architecture

## Project Structure
```
storymill/
├── src/
│   ├── components/          # UI components
│   ├── services/           # API integrations
│   ├── utils/              # Helper functions
│   ├── workers/            # Web Workers for heavy tasks
│   └── assets/             # Static assets
├── public/                 # Public files
├── tests/                  # Test files
└── docs/                   # Documentation

## Core Modules

### Audio Processing (`src/services/audio/`)
- `recorder.js` - Web Audio API recording
- `transcription.js` - Google Cloud Speech integration
- `synthesis.js` - ElevenLabs voice generation
- `effects.js` - Ambient sound processing

### Story Processing (`src/services/story/`)
- `analyzer.js` - Gemini Pro story breakdown
- `sceneGenerator.js` - Scene detection and prompt creation
- `characterTracker.js` - Character consistency management

### Visual Generation (`src/services/visual/`)
- `imageGenerator.js` - Nano Banana integration
- `editor.js` - Natural language image editing
- `animator.js` - Canvas/Remotion animation
- `renderer.js` - Final video compilation

### State Management (`src/utils/`)
- `storyState.js` - Central story state management
- `cache.js` - Local storage and caching
- `queue.js` - API request queue management

## Data Flow
1. Audio Input → Transcription Service
2. Text → Story Analyzer → Scene Objects
3. Scenes → Image Generator → Visual Assets
4. Scenes + Visuals → Voice Synthesis → Audio Assets
5. All Assets → Animator → Final Output

## Performance Considerations
- Use Web Workers for CPU-intensive tasks
- Implement progressive loading for large stories
- Cache generated assets locally
- Lazy load components and assets
- Optimize bundle size with code splitting