const express = require('express');
const router = express.Router();
const { analyzeStory, generateEditPrompt, extractCharacters } = require('../services/geminiService');
const { generateSceneImages, editImageWithAI } = require('../services/imageService');
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
 * Generate scenes with enhanced image integration
 */
router.post('/generate-scenes', async (req, res) => {
  try {
    const { storyText, uploadedImages, uploadedImageContexts } = req.body;

    if (!storyText || typeof storyText !== 'string') {
      return res.status(400).json({ error: 'Valid story text is required' });
    }

    // Process story with uploaded content

    // Step 1: Analyze story and extract characters
    const [scenes, characters] = await Promise.all([
      analyzeStory(storyText),
      extractCharacters(storyText)
    ]);

    console.log(`📖 Story analyzed: ${scenes.length} scenes, ${Object.keys(characters).length} characters`);

    // Step 2: Enhanced image processing with contexts for smart scene integration
    const scenesWithImages = await generateSceneImages(
      scenes, 
      characters, 
      uploadedImages || [], 
      uploadedImageContexts || []
    );

    // Step 3: Prepare scenes for frontend with enhanced metadata
    const frontendScenes = scenesWithImages.map(scene => ({
      ...scene,
      text: scene.description || scene.text || '', // Text for frontend narration
      narrationText: scene.description || scene.text || '' // Explicit narration text
    }));

    console.log('✅ Enhanced scenes with smart image integration generated successfully');

    // Calculate integration statistics
    const scenesWithUploads = frontendScenes.filter(scene => scene.usedUploadedImage || scene.image?.type === 'uploaded-edited').length;

    res.json({
      success: true,
      scenes: frontendScenes,
      characters,
      totalScenes: frontendScenes.length,
      hasUploadedImages: uploadedImages && uploadedImages.length > 0,
      originalText: storyText,
      // Enhanced metadata for frontend tracking
      imageIntegration: {
        uploadedCount: uploadedImages ? uploadedImages.length : 0,
        contextsAnalyzed: uploadedImageContexts ? uploadedImageContexts.length : 0,
        scenesWithUploads: scenesWithUploads,
        integrationMethod: uploadedImageContexts && uploadedImageContexts.length > 0 ? 'smart-context-matching' : 'basic'
      }
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

/**
 * POST /api/story/edit-scene-image
 * Edit a specific scene image using AI (NanoBanana)
 * This is the core endpoint for real-time image editing
 */
router.post('/edit-scene-image', async (req, res) => {
  try {
    const { 
      originalImageBase64, 
      editPrompt, 
      sceneNumber, 
      sceneContext 
    } = req.body;

    // Validation
    if (!originalImageBase64) {
      return res.status(400).json({ 
        error: 'Original image data is required' 
      });
    }

    if (!editPrompt || typeof editPrompt !== 'string') {
      return res.status(400).json({ 
        error: 'Valid edit prompt is required' 
      });
    }

    console.log(`🍌 NanoBanana editing scene ${sceneNumber}: "${editPrompt}"`);

    // Call our new AI editing function
    const editResult = await editImageWithAI(
      originalImageBase64, 
      editPrompt, 
      sceneContext || {}
    );

    console.log('✅ Scene image edited successfully');

    res.json({
      success: true,
      editedImage: editResult.imageData,
      editPrompt: editPrompt,
      sceneNumber: sceneNumber,
      editId: editResult.editId,
      timestamp: editResult.generatedAt
    });

  } catch (error) {
    console.error('Scene image editing error:', error);
    res.status(500).json({
      error: 'Failed to edit scene image',
      details: error.message
    });
  }
});

/**
 * POST /api/story/batch-edit-images
 * Edit multiple scene images in a single request
 * Useful for applying consistent changes across scenes
 */
router.post('/batch-edit-images', async (req, res) => {
  try {
    const { editRequests } = req.body;

    if (!Array.isArray(editRequests) || editRequests.length === 0) {
      return res.status(400).json({ 
        error: 'Edit requests array is required' 
      });
    }

    console.log(`🍌 NanoBanana batch editing ${editRequests.length} images`);

    const editResults = [];
    const errors = [];

    // Process each edit request
    for (let i = 0; i < editRequests.length; i++) {
      const request = editRequests[i];
      
      try {
        const editResult = await editImageWithAI(
          request.originalImageBase64,
          request.editPrompt,
          request.sceneContext || {}
        );

        editResults.push({
          index: i,
          sceneNumber: request.sceneNumber,
          success: true,
          editedImage: editResult.imageData,
          editId: editResult.editId
        });

      } catch (error) {
        errors.push({
          index: i,
          sceneNumber: request.sceneNumber,
          error: error.message
        });
      }

      // Rate limiting between requests
      if (i < editRequests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Batch editing completed: ${editResults.length} success, ${errors.length} errors`);

    res.json({
      success: true,
      results: editResults,
      errors: errors,
      totalRequests: editRequests.length,
      successCount: editResults.length,
      errorCount: errors.length
    });

  } catch (error) {
    console.error('Batch image editing error:', error);
    res.status(500).json({
      error: 'Failed to process batch edit requests',
      details: error.message
    });
  }
});

/**
 * POST /api/story/chat-edit
 * Natural language chat interface for image editing
 * Processes conversational requests and maintains context
 */
router.post('/chat-edit', async (req, res) => {
  try {
    const { 
      chatMessage, 
      currentImageBase64, 
      sceneContext,
      conversationHistory = []
    } = req.body;

    if (!chatMessage || typeof chatMessage !== 'string') {
      return res.status(400).json({ 
        error: 'Chat message is required' 
      });
    }

    if (!currentImageBase64) {
      return res.status(400).json({ 
        error: 'Current image is required for editing' 
      });
    }

    console.log(`💬 Chat edit request: "${chatMessage}"`);

    // Process the conversational request into an edit prompt
    const editPrompt = await processChatEditRequest(
      chatMessage, 
      sceneContext, 
      conversationHistory
    );

    // Apply the edit using NanoBanana
    const editResult = await editImageWithAI(
      currentImageBase64,
      editPrompt,
      sceneContext || {}
    );

    // Update conversation history
    const updatedHistory = [
      ...conversationHistory,
      {
        role: 'user',
        message: chatMessage,
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        message: `Applied edit: ${editPrompt}`,
        editId: editResult.editId,
        timestamp: editResult.generatedAt
      }
    ];

    console.log('✅ Chat edit completed successfully');

    res.json({
      success: true,
      editedImage: editResult.imageData,
      interpretedPrompt: editPrompt,
      conversationHistory: updatedHistory,
      editId: editResult.editId,
      chatResponse: `I've ${editPrompt.toLowerCase()}. How does it look?`
    });

  } catch (error) {
    console.error('Chat edit error:', error);
    res.status(500).json({
      error: 'Failed to process chat edit request',
      details: error.message
    });
  }
});

/**
 * Helper function to process conversational edit requests
 */
const processChatEditRequest = async (chatMessage, sceneContext, history) => {
  // Simple prompt conversion - can be enhanced with more sophisticated NLP
  let editPrompt = chatMessage.toLowerCase();

  // Convert common conversational phrases to edit instructions
  const conversions = {
    'change the color of': 'change color of',
    'make the': 'make',
    'can you': '',
    'please': '',
    'i want': '',
    'could you': '',
    'change to': 'change to',
    'make it': 'make',
    'turn the': 'change the'
  };

  Object.entries(conversions).forEach(([phrase, replacement]) => {
    editPrompt = editPrompt.replace(new RegExp(phrase, 'gi'), replacement);
  });

  return editPrompt.trim();
};

/**
 * POST /api/story/export-video
 * Export story as a downloadable video
 */
router.post('/export-video', async (req, res) => {
  try {
    const { storyId, title, scenes } = req.body;
    
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ 
        error: 'Valid scenes are required',
        details: 'Please provide an array of scene objects'
      });
    }

    console.log(`🎬 Exporting story as video: "${title}" with ${scenes.length} scenes`);
    
    // Generate a unique video ID
    const videoId = `story-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create the video using videoService
    const videoData = await createStoryVideo(scenes, title);
    
    // Return success with video URL
    res.json({
      success: true,
      videoId: videoData.videoId,
      videoUrl: `/api/video/download/${videoData.videoId}`,
      streamUrl: `/api/video/stream/${videoData.videoId}`,
      title: title,
      sceneCount: scenes.length
    });
    
  } catch (error) {
    console.error('Video export error:', error);
    res.status(500).json({
      error: 'Failed to export video',
      details: error.message
    });
  }
});

module.exports = router;