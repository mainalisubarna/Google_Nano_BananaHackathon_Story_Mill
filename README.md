# StoryMill

StoryMill is an AI-powered visual storytelling platform that transforms text narratives into cohesive visual stories with consistent characters across scenes using Gemini 2.5 Flash Image capabilities.

## Setup

### Prerequisites
- Node.js 18+
- Google Gemini API key

### Quick Setup
```bash
# Install dependencies (both frontend and backend)
npm install

# Create environment file and add your API key
cp backend/.env.example backend/.env
# Edit backend/.env and add GOOGLE_GEMINI_API_KEY

# Start backend server
cd backend
npm start

# In a new terminal, start frontend
cd frontend
npm run dev
```

### Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini 2.5 Flash Image
- **Audio**: ElevenLabs


## License

MIT License

---

Created for the NanoBanana Hackathon