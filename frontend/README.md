# StoryMill Frontend

## 🌟 Overview
Beautiful, responsive React frontend for StoryMill - the AI-powered visual storytelling platform.

## ✨ Features

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Framer Motion powered transitions and interactions
- **Glass Morphism**: Modern glassmorphism design with backdrop blur effects
- **Gradient Themes**: Beautiful gradient color schemes throughout
- **Dark/Light Modes**: Automatic theme adaptation

### 🚀 Core Functionality
- **Story Creation**: Multiple input methods (text, voice, file upload)
- **Real-time Processing**: Live progress tracking with animated steps
- **Story Preview**: Interactive scene navigation and video preview
- **Audio Controls**: Play/pause narration and ambient sounds
- **Video Download**: Direct MP4 download and streaming
- **Social Sharing**: Native share API integration

### 📱 User Experience
- **Voice Recording**: Built-in microphone recording with waveform
- **File Upload**: Drag-and-drop audio file support
- **Progress Tracking**: Visual progress indicators for story generation
- **Error Handling**: Graceful error states with helpful messages
- **Loading States**: Engaging loading animations and skeletons

## 🛠️ Technology Stack

### Core Framework
- **React 18**: Latest React with hooks and concurrent features
- **Vite**: Lightning-fast build tool and dev server
- **React Router**: Client-side routing with lazy loading

### Styling & Animation
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Production-ready motion library
- **Custom CSS**: Advanced animations and effects

### UI Components
- **Lucide React**: Beautiful, customizable icons
- **React Hot Toast**: Elegant toast notifications
- **React Dropzone**: File upload with drag-and-drop
- **React Audio Voice Recorder**: Voice recording component

### API Integration
- **Axios**: HTTP client with interceptors and error handling
- **Custom API Layer**: Organized API methods and error handling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- StoryMill backend running on port 3001

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```
Opens on http://localhost:5173

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Navbar.jsx    # Navigation bar
│   │   ├── Footer.jsx    # Site footer
│   │   ├── ProcessingSteps.jsx  # Story generation progress
│   │   └── StoryPreview.jsx     # Story viewing component
│   ├── pages/            # Page components
│   │   ├── HomePage.jsx  # Landing page
│   │   ├── CreateStoryPage.jsx  # Story creation
│   │   ├── ViewStoryPage.jsx    # Story viewing
│   │   └── AboutPage.jsx        # About page
│   ├── services/         # API integration
│   │   └── api.js       # API methods and configuration
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # App entry point
│   └── index.css        # Global styles and utilities
├── package.json         # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── README.md           # This file
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue gradient (#0ea5e9 to #0284c7)
- **Secondary**: Purple gradient (#d946ef to #c026d3)
- **Accent**: Orange gradient (#f97316 to #ea580c)
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700, 800
- **Responsive**: Fluid typography scaling

### Components
- **Cards**: Glass morphism with backdrop blur
- **Buttons**: Gradient backgrounds with hover effects
- **Inputs**: Rounded corners with focus states
- **Animations**: Smooth transitions and micro-interactions

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=StoryMill
VITE_APP_VERSION=1.0.0
```

### API Integration
The frontend connects to the StoryMill backend API:
- **Base URL**: Configurable via VITE_API_URL
- **Timeout**: 5 minutes for story generation
- **Error Handling**: Automatic retry and user feedback
- **Request/Response Interceptors**: Logging and error handling

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Features
- **Mobile-First**: Designed for mobile, enhanced for desktop
- **Touch-Friendly**: Large touch targets and gestures
- **Adaptive Layout**: Grid systems that adapt to screen size
- **Performance**: Optimized images and lazy loading

## 🎭 Animations & Interactions

### Page Transitions
- **Fade In**: Smooth page entry animations
- **Slide Up**: Content reveal animations
- **Stagger**: Sequential element animations

### Micro-Interactions
- **Hover Effects**: Button and card hover states
- **Loading States**: Skeleton screens and spinners
- **Progress Indicators**: Animated progress bars
- **Toast Notifications**: Slide-in notifications

### Advanced Effects
- **Parallax**: Subtle background movement
- **Morphing**: Shape and color transitions
- **Particle Effects**: Floating elements
- **Gradient Animation**: Animated background gradients

## 🔊 Audio Features

### Voice Recording
- **Real-time Recording**: Live audio capture
- **Waveform Display**: Visual audio feedback
- **Playback Controls**: Play/pause recorded audio
- **Time Limits**: Maximum 5-minute recordings

### Audio Playback
- **Scene Audio**: Individual scene narration
- **Ambient Sounds**: Background audio for scenes
- **Volume Controls**: Mute/unmute functionality
- **Audio Mixing**: Balanced narration and ambient audio

## 📹 Video Features

### Video Preview
- **Scene Navigation**: Click through story scenes
- **Video Controls**: Play/pause scene audio
- **Full Video**: Stream complete generated video
- **Download**: Direct MP4 download

### Video Information
- **Metadata Display**: Resolution, FPS, duration
- **Scene Details**: Individual scene information
- **Character Info**: Story character descriptions
- **Creation Date**: When the story was generated

## 🚀 Performance Optimizations

### Code Splitting
- **Route-based**: Lazy load page components
- **Component-based**: Dynamic imports for large components
- **Bundle Analysis**: Webpack bundle analyzer integration

### Asset Optimization
- **Image Optimization**: WebP format with fallbacks
- **Font Loading**: Preload critical fonts
- **CSS Purging**: Remove unused Tailwind classes
- **Compression**: Gzip compression for production

### Runtime Performance
- **React Optimization**: useMemo, useCallback, React.memo
- **Virtual Scrolling**: For large lists
- **Debounced Inputs**: Prevent excessive API calls
- **Error Boundaries**: Graceful error handling

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Accessibility Tests
```bash
npm run test:a11y
```

## 🚀 Deployment

### Build
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel --prod
```

### Deploy to Netlify
```bash
netlify deploy --prod --dir=dist
```

### Docker
```bash
docker build -t storymill-frontend .
docker run -p 3000:3000 storymill-frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**StoryMill Frontend v1.0** - Beautiful, responsive, and performant! 🌟