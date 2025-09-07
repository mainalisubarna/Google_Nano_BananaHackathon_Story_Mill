const express = require('express');
const router = express.Router();
const { analyzeStory, generateEditPrompt, extractCharacters } = require('../services/geminiService');
const { generateSceneImages } = require('../services/imageService');
const { generateSceneNarration } = require('../services/audioService');
const { createStoryVideo } = require('../services/videoService');
const { validateStoryInput, validateScenes, validateVideoRequirements } = require('../utils/validation');

/**
 * POST /api/story/analyze
 * Analyze story text and break into scenes
 */
router.post('/analyze', async (req, res) => {
  try {
    const { storyText } = req.body;

    if (!storyText || typeof storyText !== 'string') {
      return res.status(400).json({ error: 'Valid story text is required' });
    }

    const scenes = await analyzeStory(storyText);
    const characters = await extractCharacters(storyText);

    res.json({
      success: true,
      scenes,
      characters,
      totalScenes: scenes.length
    });
  } catch (error) {
    console.error('Story analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze story',
      details: error.message
    });
  }
});

/**
 * POST /api/story/generate-scenes
 * Generate scenes with images for frontend slideshow
 */
router.post('/generate-scenes', async (req, res) => {
  try {
    const { storyText, uploadedImages } = req.body;

    if (!storyText || typeof storyText !== 'string') {
      return res.status(400).json({ error: 'Valid story text is required' });
    }

    console.log(`📝 Processing story for scenes: "${storyText.substring(0, 100)}..."`);
    console.log(`🖼️ Uploaded images: ${uploadedImages ? uploadedImages.length : 0}`);

    // Step 1: Analyze story and extract characters
    const [scenes, characters] = await Promise.all([
      analyzeStory(storyText),
      extractCharacters(storyText)
    ]);

    console.log(`📖 Story analyzed: ${scenes.length} scenes, ${Object.keys(characters).length} characters`);

    // Step 2: Process images ONLY (no audio generation in backend)
    const scenesWithImages = await generateSceneImages(scenes, characters, uploadedImages);

    // Step 3: Prepare scenes for frontend with proper text property
    const frontendScenes = scenesWithImages.map(scene => ({
      ...scene,
      text: scene.description || scene.text || '', // Text for frontend narration
      narrationText: scene.description || scene.text || '' // Explicit narration text
    }));

    console.log('✅ Scenes with images generated successfully');

    res.json({
      success: true,
      scenes: frontendScenes,
      characters,
      totalScenes: frontendScenes.length,
      hasUploadedImages: uploadedImages && uploadedImages.length > 0,
      originalText: storyText
    });
  } catch (error) {
    console.error('Scene generation error:', error);
    res.status(500).json({
      error: 'Failed to generate scenes',
      details: error.message
    });
  }
});

/**
 * POST /api/story/generate-complete
 * Generate complete story from text OR audio input - UNIFIED WITH VALIDATION
 */
router.post('/generate-complete', async (req, res) => {
  try {
    // Validate input first
    const validation = validateStoryInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: validation.errors
      });
    }
    
    let storyText;

    // Handle both text and audio input
    if (req.body.storyText) {
      // Direct text input
      storyText = req.body.storyText;
      console.log(`📝 Processing text story: "${storyText.substring(0, 100)}..."`);
    } else if (req.body.audioData) {
      // Audio input - transcribe first
      console.log('🎙️ Transcribing audio input...');
      const { transcribeAudio } = require('../services/audioService');
      const audioBuffer = Buffer.from(req.body.audioData, 'base64');
      const transcription = await transcribeAudio(audioBuffer);
      storyText = transcription.transcript;
      console.log(`📝 Transcribed: "${storyText.substring(0, 100)}..."`);
    }

    console.log('🚀 Starting optimized story generation...');

    // Step 1: Analyze story and extract characters in parallel
    const [scenes, characters] = await Promise.all([
      analyzeStory(storyText),
      extractCharacters(storyText)
    ]);

    console.log(`📖 Story analyzed: ${scenes.length} scenes, ${Object.keys(characters).length} characters`);
    
    // Validate generated scenes
    const sceneValidation = validateScenes(scenes);
    if (!sceneValidation.valid) {
      console.error('Scene validation failed:', sceneValidation.errors);
      return res.status(500).json({
        error: 'Generated scenes are invalid',
        details: sceneValidation.errors
      });
    }

    // Step 2: Generate images with character consistency
    const scenesWithImages = await generateSceneImages(scenes, characters);
    
    // Validate video requirements
    const videoValidation = validateVideoRequirements(scenesWithImages);
    if (!videoValidation.valid) {
      console.error('Video validation failed:', videoValidation.errors);
      return res.status(500).json({
        error: 'Video generation requirements not met',
        details: videoValidation.errors
      });
    }

    // Step 3: Generate context-aware audio and ambient sounds
    const scenesWithAudio = await generateSceneNarration(scenesWithImages);

    // Step 4: Create animated video with context-aware transitions
    const videoData = await createStoryVideo(scenesWithAudio);

    console.log('✅ Story generation completed successfully');

    res.json({
      success: true,
      story: {
        originalText: storyText,
        scenes: scenesWithAudio,
        characters,
        video: videoData
      }
    });
  } catch (error) {
    console.error('Complete story generation error:', error);
    res.status(500).json({
      error: 'Failed to generate complete story',
      details: error.message
    });
  }
});

/**
 * POST /api/story/transcribe
 * Transcribe audio to text
 */
router.post('/transcribe', async (req, res) => {
  try {
    const { audioData } = req.body;

    if (!audioData) {
      return res.status(400).json({
        error: 'Audio data is required'
      });
    }

    const { transcribeAudio } = require('../services/audioService');
    const audioBuffer = Buffer.from(audioData, 'base64');
    const transcription = await transcribeAudio(audioBuffer);

    res.json({
      success: true,
      transcript: transcription.transcript,
      confidence: transcription.confidence,
      provider: transcription.provider
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      details: error.message
    });
  }
});

/**
 * POST /api/story/text-to-speech
 * Convert text to speech for frontend narration
 */
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Valid text is required'
      });
    }

    const { textToSpeech } = require('../services/audioService');
    const audio = await textToSpeech(text);

    res.json({
      success: true,
      audioUrl: audio.audioUrl,
      duration: audio.duration,
      provider: audio.provider
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      details: error.message
    });
  }
});

/**
 * POST /api/story/edit-prompt
 * Generate new prompt based on user edit request
 */
router.post('/edit-prompt', async (req, res) => {
  try {
    const { originalPrompt, userEdit } = req.body;

    if (!originalPrompt || !userEdit) {
      return res.status(400).json({
        error: 'Original prompt and user edit are required'
      });
    }

    const newPrompt = await generateEditPrompt(originalPrompt, userEdit);

    res.json({
      success: true,
      newPrompt
    });
  } catch (error) {
    console.error('Edit prompt generation error:', error);
    res.status(500).json({
      error: 'Failed to generate edit prompt',
      details: error.message
    });
  }
});


/**
 * GET /api/story/demo
 * Get a demo story for testing
 */
router.get('/demo', async (req, res) => {
  try {
    const { getRandomDemoStory } = require('../utils/demoStories');
    const demoStory = getRandomDemoStory();
    
    console.log(`🎭 Generating demo story: "${demoStory.title}"`);
    
    // Generate complete story from demo with validation
    const [scenes, characters] = await Promise.all([
      analyzeStory(demoStory.text),
      extractCharacters(demoStory.text)
    ]);
    
    // Validate demo scenes
    const sceneValidation = validateScenes(scenes);
    if (!sceneValidation.valid) {
      throw new Error(`Demo scene validation failed: ${sceneValidation.errors.join(', ')}`);
    }
    
    const scenesWithImages = await generateSceneImages(scenes, characters);
    const scenesWithAudio = await generateSceneNarration(scenesWithImages);
    const videoData = await createStoryVideo(scenesWithAudio);

    res.json({
      success: true,
      demo: true,
      story: {
        title: demoStory.title,
        originalText: demoStory.text,
        scenes: scenesWithAudio,
        characters,
        video: videoData
      }
    });
  } catch (error) {
    console.error('Demo story error:', error);
    res.status(500).json({
      error: 'Failed to generate demo story',
      details: error.message
    });
  }
});

/**
 * GET /api/story/status
 * Get comprehensive backend status
 */
router.get('/status', async (req, res) => {
  try {
    const { validateAPIKeys } = require('../utils/validation');
    const apiStatus = validateAPIKeys();
    
    const systemStatus = {
      timestamp: new Date().toISOString(),
      backend: 'StoryMill v1.0',
      status: 'running',
      apis: apiStatus,
      features: {
        textInput: true,
        audioInput: apiStatus.status.elevenlabs || apiStatus.status.googleCloud,
        imageGeneration: apiStatus.status.gemini,
        imageEditing: apiStatus.status.gemini,
        voiceSynthesis: apiStatus.status.elevenlabs || apiStatus.status.googleCloud,
        ambientSounds: apiStatus.status.elevenlabs,
        videoGeneration: true,
        contextAwareTransitions: true
      },
      videoSettings: {
        fps: 60,
        resolution: '1920x1080',
        format: 'mp4',
        transitions: ['fade', 'dissolve', 'wipe', 'slide', 'circle', 'fadeblack', 'fadewhite'],
        maxScenes: 6,
        minScenes: 3
      }
    };
    
    res.json(systemStatus);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Failed to get system status',
      details: error.message
    });
  }
});

module.exports = router;