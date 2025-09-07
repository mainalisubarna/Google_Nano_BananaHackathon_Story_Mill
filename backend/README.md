# StoryMill Backend

## 🌟 Overview
StoryMill backend is a high-performance Node.js server that transforms text or audio input into cinematic animated stories with AI-generated visuals, context-aware narration, and professional video output.

## 🚀 Key Features

### 📝 Story Processing
- **Text Input**: Direct story text processing
- **Audio Input**: Speech-to-text transcription with Google Cloud Speech
- **Parallel Processing**: Story analysis and character extraction run simultaneously
- **Comprehensive Validation**: Input validation, scene validation, and video requirements checking

### 🎨 Visual Generation
- **AI Image Generation**: Powered by Gemini 2.5 Flash (Nano Banana)
- **Character Consistency**: Maintains character appearance across all scenes
- **Natural Language Editing**: Edit images with simple text descriptions
- **Style Consistency**: Maintains artistic style throughout the story

### 🔊 Audio Generation
- **Voice Synthesis**: Google Cloud TTS primary (cost-effective), ElevenLabs fallback
- **Speech Recognition**: ElevenLabs primary (superior accuracy), Google Cloud fallback
- **Ambient Sounds**: Context-aware background audio (15+ different types)
- **Parallel Audio Processing**: All scene audio generated simultaneously
- **Audio Mixing**: Professional audio track mixing in final video

### 🎬 Video Generation
- **Context-Aware Transitions**: Smart transitions based on story mood and flow
- **60fps Output**: Smooth, professional video quality
- **1920x1080 Resolution**: Full HD output
- **MP4 Format**: Universal compatibility

## 🎯 Service Optimization Strategy

### Audio Service Selection
- **Text-to-Speech**: Google Cloud primary (60% cost savings), ElevenLabs fallback
- **Speech-to-Text**: ElevenLabs primary (superior accuracy for storytelling), Google Cloud fallback
- **Ambient Sounds**: ElevenLabs only (no cost-effective alternative available)

### Quality vs Cost Balance
- **TTS**: Google Cloud Standard voices provide excellent quality at lower cost
- **STT**: ElevenLabs Whisper-1 excels at natural speech recognition for stories
- **Images**: Gemini Imagen 4 premium quality justified for visual storytelling
- **Fallbacks**: Ensure reliability without compromising user experience

## 🎭 Context-Aware Features

### Transition Types
- **Horror/Scary** → `fadeblack` (1.2s) - Ominous fade through black
- **Action/Exciting** → `wipeleft/slideright` (0.3-0.4s) - Dynamic transitions
- **Magical** → `circlecrop` (1.0s) - Mystical circle reveal
- **Day→Night** → `fadeblack` (1.5s) - Natural lighting transition
- **Night→Day** → `fadewhite` (1.0s) - Dawn-like fade
- **Sad→Happy** → `slideup` (0.8s) - Uplifting movement
- **Happy→Sad** → `slidedown` (1.0s) - Emotional descent

### Ambient Sound Context
- **Horror**: Eerie whispers, creaking, haunting atmosphere
- **Action**: Dramatic tension, footsteps, adventure sounds
- **Magical**: Sparkles, mystical chimes, enchanted ambience
- **Nature**: Birds chirping, wind, forest sounds
- **Urban**: Traffic, crowds, city ambience
- **Ocean**: Waves, seagulls, water sounds
- **Forest**: Rustling leaves, wildlife, nature sounds

## 🏗️ Architecture

### Core Services
```
src/
├── services/
│   ├── geminiService.js     # AI story analysis & image generation
│   ├── audioService.js      # Voice synthesis & transcription
│   ├── imageService.js      # Image generation & editing
│   └── videoService.js      # Video compilation & rendering
├── routes/
│   └── story.js            # Main API endpoints
└── utils/
    └── validation.js       # Input & output validation
```

### API Endpoints

#### Main Endpoints
- `POST /api/story/generate-complete` - Generate complete story from text/audio
- `GET /api/story/demo` - Generate demo story for testing
- `GET /api/story/status` - Comprehensive backend status

#### System Endpoints
- `GET /api/health` - Basic health check with API status
- `GET /api/system/status` - Detailed system information
- `GET /api/system/metrics` - Performance metrics and statistics

## ⚡ Performance Optimizations

### Parallel Processing
- Story analysis + character extraction run simultaneously
- All scene audio generated in parallel with staggered delays
- Narration + ambient sound generated simultaneously per scene

### Memory Management
- Temporary file cleanup every 30 minutes
- Files older than 1 hour automatically deleted
- Memory usage monitoring and reporting

### Error Handling
- Comprehensive validation at every step
- Graceful fallbacks for API failures
- Detailed error messages with context
- Input sanitization and validation

## 🔧 Configuration

### Required Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key (optional)
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Video Settings
- **FPS**: 60
- **Resolution**: 1920x1080
- **Format**: MP4
- **Max Scenes**: 6
- **Min Scenes**: 3
- **Transitions**: fade, dissolve, wipe, slide, circle, fadeblack, fadewhite

## 🚀 Getting Started

### Installation
```bash
cd backend
npm install
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/api/health
```

### System Status
```bash
curl http://localhost:3001/api/system/status
```

### Performance Metrics
```bash
curl http://localhost:3001/api/system/metrics
```

## 🎯 Processing Flow

```
📝 Input Validation
    ↓
🧠 Parallel Analysis (Story + Characters)
    ↓
🎨 Image Generation (Character Consistency)
    ↓
🔊 Parallel Audio Generation (Narration + Ambient)
    ↓
🎬 Context-Aware Video Compilation
    ↓
📥 Temporary File Storage & Cleanup
```

## 🔒 Security Features

- Input validation and sanitization
- API key validation
- CORS configuration
- Request size limits (50MB)
- Temporary file management
- Error message sanitization

## 📈 Performance Metrics

The backend tracks:
- Total requests processed
- Success/failure rates
- Average processing times
- Memory usage
- System uptime
- API response times

## 🎪 Demo Stories

The backend includes built-in demo stories for testing:
- Classic folktales
- Adventure stories
- Magical tales
- Educational content

## 🔄 Continuous Improvements

- Automatic temp file cleanup
- Performance monitoring
- Memory optimization
- Error tracking
- API usage monitoring

---

**StoryMill Backend v1.0** - Production-ready with enterprise-level performance, validation, and monitoring! 🌟