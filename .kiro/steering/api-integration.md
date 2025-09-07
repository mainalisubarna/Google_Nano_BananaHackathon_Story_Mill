# StoryMill API Integration Guide

## Gemini Integration
- **Gemini Pro**: Use for story analysis, scene breakdown, and prompt generation
- **Nano Banana**: Primary tool for image generation and editing with natural language
- Implement consistent character prompts across scenes
- Use structured prompts for better scene continuity

## ElevenLabs Voice Synthesis
- Implement voice cloning for consistent narration
- Support multiple languages and accents
- Add emotion and pacing controls
- Cache generated audio to reduce API calls

## Google Cloud Speech
- Real-time transcription for voice input
- Support multiple languages
- Implement noise reduction and audio preprocessing
- Handle long-form audio with chunking

## Image Generation Best Practices
- Maintain character reference sheets for consistency
- Use seed values for reproducible results
- Implement batch processing for multiple scenes
- Add style consistency prompts (art style, lighting, mood)

