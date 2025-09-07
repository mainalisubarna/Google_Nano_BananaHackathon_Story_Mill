# 🔧 StoryMill Troubleshooting Guide

## Common Issues and Solutions

### ❌ "Request failed with status code 404"

This error means the frontend can't find the backend API endpoint.

#### Quick Fixes:

1. **Check if backend is running:**
   ```bash
   cd backend
   npm run test-connection
   ```

2. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Should show: `🌟 StoryMill backend running on port 3001`

3. **Verify API URL in frontend:**
   Check `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Test backend health:**
   Open: http://localhost:3001/api/health
   Should return JSON with backend status.

#### Detailed Diagnosis:

```bash
# Test backend connection
cd backend
npm run test-connection

# Check available routes
curl http://localhost:3001/api/debug/routes

# Test specific endpoint
curl -X POST http://localhost:3001/api/story/generate-complete \
  -H "Content-Type: application/json" \
  -d '{"storyText":"Test story"}'
```

### ❌ "Generation Failed" with API Errors

This usually means missing or invalid API keys.

#### Quick Fixes:

1. **Check API keys:**
   ```bash
   cd backend
   npm run test-services
   ```

2. **Configure API keys:**
   Copy `backend/.env.example` to `backend/.env` and add:
   ```env
   GEMINI_API_KEY=your_actual_gemini_key
   GOOGLE_CLOUD_API_KEY=your_actual_google_key
   ELEVENLABS_API_KEY=your_actual_elevenlabs_key
   ```

3. **Verify API key format:**
   - Gemini: Starts with `AI...`
   - Google Cloud: Usually long alphanumeric string
   - ElevenLabs: Starts with `sk-...` or similar

### ❌ Frontend CSS Errors

If you see Tailwind CSS errors:

1. **Clear cache and reinstall:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Tailwind config:**
   Ensure `frontend/tailwind.config.js` exists and is properly configured.

### ❌ "Network Error" or "ECONNREFUSED"

This means the frontend can't connect to the backend.

#### Quick Fixes:

1. **Check if backend is running on port 3001:**
   ```bash
   netstat -an | grep 3001
   # or
   lsof -i :3001
   ```

2. **Check firewall/antivirus:**
   Temporarily disable to test if they're blocking the connection.

3. **Try different port:**
   In `backend/.env`:
   ```env
   PORT=3002
   ```
   And in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3002/api
   ```

### ❌ "Module not found" Errors

Missing dependencies:

```bash
# Backend
cd backend
npm install

# Frontend  
cd frontend
npm install
```

### ❌ FFmpeg Errors (Video Generation)

Video generation requires FFmpeg:

#### Windows:
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Add to PATH environment variable
3. Restart terminal/IDE

#### macOS:
```bash
brew install ffmpeg
```

#### Linux:
```bash
sudo apt update
sudo apt install ffmpeg
```

### ❌ Memory/Performance Issues

If the system is slow or crashes:

1. **Increase Node.js memory:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Check system resources:**
   - RAM usage
   - Available disk space
   - CPU usage

3. **Reduce concurrent processing:**
   Edit `backend/services/audioService.js` and increase delay:
   ```javascript
   await new Promise(resolve => setTimeout(resolve, index * 500)); // Increased from 200
   ```

## 🔍 Debugging Tools

### Backend Debugging:

```bash
# Test all services
cd backend
npm run test-services

# Test connection
npm run test-connection

# Check routes
curl http://localhost:3001/api/debug/routes

# Health check
curl http://localhost:3001/api/health
```

### Frontend Debugging:

1. **Open browser developer tools (F12)**
2. **Check Console tab for errors**
3. **Check Network tab for failed requests**
4. **Look for red error messages in the UI**

### Full System Test:

```bash
# Start everything with logging
node start-storymill.js
```

## 📞 Getting Help

If you're still having issues:

1. **Check the logs:**
   - Backend: Look at terminal output where you ran `npm run dev`
   - Frontend: Check browser developer console

2. **Gather information:**
   - Operating system
   - Node.js version (`node --version`)
   - Error messages (exact text)
   - Steps to reproduce

3. **Common solutions:**
   - Restart both backend and frontend
   - Clear browser cache
   - Check API key validity
   - Verify all dependencies are installed

## 🎯 Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Backend `.env` file configured with API keys
- [ ] Frontend `.env` file has correct API URL
- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Health check returns success: http://localhost:3001/api/health

## 🌟 Success Indicators

When everything is working correctly:

- ✅ Backend shows: "StoryMill backend running on port 3001"
- ✅ Frontend shows: "Local: http://localhost:5173/"
- ✅ Health check returns JSON with status "running"
- ✅ Story generation completes without errors
- ✅ Video download works

---

### ❌ Video Generation Errors

If you see "currentStream is not defined" or other video generation errors:

#### Quick Fixes:

1. **Test video generation:**
   ```bash
   cd backend
   npm run test-video
   ```

2. **Check FFmpeg installation:**
   ```bash
   ffmpeg -version
   ```

3. **Restart backend server:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Clear temp files:**
   ```bash
   # Windows
   rmdir /s backend\temp
   mkdir backend\temp
   
   # Linux/Mac
   rm -rf backend/temp/*
   ```

### ❌ Image Generation Errors

If you see errors related to Google GenAI or image generation:

#### Quick Fixes:

1. **Install the correct package:**
   ```bash
   cd backend
   npm install @google/genai@latest
   ```

2. **Test image generation:**
   ```bash
   cd backend
   npm run test-images
   ```

3. **Check API access:**
   - Verify your Gemini API key has access to Imagen 4.0
   - Check your API quota and billing settings
   - Ensure you're using the latest API version

4. **Update dependencies:**
   ```bash
   # Quick fix for all dependencies
   node install-dependencies.js
   ```

**Still having issues? The problem is likely one of these common causes:**
1. Backend not running
2. Wrong API URL in frontend
3. Missing API keys
4. Port conflicts
5. Firewall blocking connections
6. Outdated Google GenAI package
7. Insufficient API permissions