# StoryMill Deployment Guide

## Environment Configuration
- **Development**: Local development with mock APIs
- **Staging**: Firebase hosting with test API keys
- **Production**: Firebase hosting with production APIs

## Required Environment Variables
```
GEMINI_API_KEY=your_gemini_key
ELEVENLABS_API_KEY=your_elevenlabs_key
GOOGLE_CLOUD_API_KEY=your_google_cloud_key
FIREBASE_CONFIG=your_firebase_config
```

## Build Process
1. Bundle JavaScript with Webpack/Vite
2. Optimize images and assets
3. Generate service worker for offline support
4. Create production environment config
5. Deploy to Firebase hosting

## Performance Monitoring
- Track API response times
- Monitor bundle size and loading times
- Log user interaction patterns
- Track conversion rates (voice → final story)

## Security Checklist
- API keys stored securely in Firebase Functions
- CORS configured properly
- File upload validation
- Rate limiting on API endpoints
- Content moderation for user-generated stories

## Backup Strategy
- User stories backed up to Firebase Storage
- Generated assets cached with expiration
- API usage logs for debugging
- Regular database backups

## Scaling Considerations
- Use Firebase Functions for API proxying
- Implement CDN for static assets
- Consider queue system for batch processing
- Monitor API rate limits and costs