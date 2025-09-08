const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff, generateId, sanitizeText } = require('../utils/apiHelpers');

// Configuration
const CONFIG = {
  MODEL_NAME: 'gemini-2.5-flash-image-preview',
  DEFAULT_STYLE: 'storybook illustration',
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  RATE_LIMIT_DELAY: 1000,
  PLACEHOLDER_WIDTH: 800,
  PLACEHOLDER_HEIGHT: 600,
  DEFAULT_MIME_TYPE: 'image/png',
  MAX_PROMPT_LENGTH: 1800,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  // Image generation specific configs
  IMAGE_GENERATION_PREFIXES: [
    'Generate an image:',
    'Create a visual image showing:',
    'Produce an illustration of:',
    'Draw a picture of:'
  ]
};

// Initialize Gemini AI
const initializeGemini = () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found - image generation will use fallbacks');
      return null;
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    if (CONFIG.LOG_LEVEL === 'info') {
      console.log('Google GenAI initialized successfully');
    }
    return genAI;
  } catch (error) {
    console.error('GenAI initialization failed:', error.message);
    return null;
  }
};

const genAI = initializeGemini();

// Helper function to format prompts for explicit image generation
const formatImageGenerationPrompt = (prompt) => {
  // Check if prompt already has an image generation prefix
  const hasPrefix = CONFIG.IMAGE_GENERATION_PREFIXES.some(prefix => 
    prompt.toLowerCase().startsWith(prefix.toLowerCase())
  );
  
  if (hasPrefix) {
    return prompt;
  }
  
  // Add explicit image generation prefix
  return `Generate an image: ${prompt}`;
};

// Validation functions - removed old validatePrompt, using intelligent validateAndOptimizePrompt instead

const validateImageData = (base64Data) => {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error('Invalid image data: must be base64 string');
  }
  
  const estimatedSize = (base64Data.length * 3) / 4;
  if (estimatedSize > CONFIG.MAX_IMAGE_SIZE) {
    const sizeMB = Math.round(estimatedSize / 1024 / 1024);
    const limitMB = CONFIG.MAX_IMAGE_SIZE / 1024 / 1024;
    throw new Error(`Image too large: ${sizeMB}MB exceeds ${limitMB}MB limit`);
  }
};

const isPlaceholderImage = (imageData) => {
  return !imageData || 
         imageData.includes('data:image/svg+xml') ||
         imageData.includes('Generation failed') ||
         imageData.includes('Prompt too long');
};

const detectMimeType = (base64Data) => {
  const signatures = {
    '/9j/': 'image/jpeg',
    'iVBORw0KGgo': 'image/png',
    'R0lGOD': 'image/gif',
    'UklGR': 'image/webp'
  };
  
  for (const [signature, mimeType] of Object.entries(signatures)) {
    if (base64Data.startsWith(signature)) return mimeType;
  }
  
  return CONFIG.DEFAULT_MIME_TYPE;
};

// NEW: Intelligent prompt reduction using Gemini
const reducePromptWithGemini = async (longPrompt, targetLength = CONFIG.MAX_PROMPT_LENGTH) => {
  if (!genAI) {
    // Fallback to simple truncation if Gemini not available
    console.warn('Gemini not available for prompt reduction, using simple truncation');
    return longPrompt.substring(0, targetLength - 50) + '...';
  }

  try {
    console.log(`🔧 Reducing prompt from ${longPrompt.length} to under ${targetLength} characters using Gemini...`);
    
    const reductionPrompt = `PROMPT OPTIMIZATION TASK: Reduce this image generation prompt to under ${targetLength} characters while preserving all essential visual elements and creative intent.

ORIGINAL PROMPT (${longPrompt.length} chars):
"${longPrompt}"

REQUIREMENTS:
1. Keep all critical visual elements (subjects, actions, setting, mood)
2. Preserve artistic style specifications
3. Maintain character consistency details if present
4. Remove redundant words and phrases
5. Use concise, powerful descriptive language
6. Stay under ${targetLength} characters
7. Ensure the result is still a complete, coherent image prompt

OPTIMIZED PROMPT:`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const response = await retryWithBackoff(() => model.generateContent([reductionPrompt]));
    
    const reducedPrompt = response.response.text().trim();
    
    // Clean up the response (remove quotes, extra formatting)
    const cleanedPrompt = reducedPrompt
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^OPTIMIZED PROMPT:\s*/i, '') // Remove prefix if present
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    if (cleanedPrompt.length <= targetLength && cleanedPrompt.length > 20) {
      console.log(`✅ Prompt successfully reduced: ${longPrompt.length} → ${cleanedPrompt.length} characters`);
      return cleanedPrompt;
    } else {
      console.warn('Gemini reduction result invalid, using fallback truncation');
      return longPrompt.substring(0, targetLength - 50) + '...';
    }
  } catch (error) {
    console.error('Gemini prompt reduction failed:', error.message);
    // Fallback to intelligent truncation
    return longPrompt.substring(0, targetLength - 50) + '...';
  }
};

// Enhanced validation with intelligent reduction
const validateAndOptimizePrompt = async (prompt, maxLength = CONFIG.MAX_PROMPT_LENGTH) => {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }
  
  if (prompt.length <= maxLength) {
    return prompt; // No reduction needed
  }
  
  console.log(`⚠️ Prompt length ${prompt.length} exceeds ${maxLength} characters, using Gemini for intelligent reduction...`);
  return await reducePromptWithGemini(prompt, maxLength);
};

// Enhanced style templates with optimized prompts for Gemini
const getStyleTemplates = () => ({
  'storybook illustration': 'Professional children\'s book illustration with vibrant colors, clean composition, engaging character expressions, and masterful artistic technique suitable for publication',
  'watercolor': 'Delicate watercolor painting with transparent layers, organic texture, controlled color bleeding, and professional brushwork techniques',
  'digital art': 'High-resolution digital artwork with crisp details, rich colors, photorealistic rendering, proper lighting and atmospheric depth',
  'cartoon': 'Vibrant cartoon illustration with bold linework, expressive character design, appealing color palette, and professional animation quality',
  'realistic': 'Photorealistic scene with natural lighting, accurate textures, proper perspective, and CGI-quality rendering',
  'comic panel': 'Professional comic book panel with dynamic composition, clear visual storytelling, dramatic lighting, and sequential art principles',
  'sequential art': 'Cinematic sequential art frame with consistent character design, clear action flow, and graphic novel quality illustration'
});

// Optimized prompt creation for Gemini with character limit management
const createOptimizedPrompt = (description, style = CONFIG.DEFAULT_STYLE, characterContext = null) => {
  const styleTemplates = getStyleTemplates();
  const styleDescription = styleTemplates[style] || styleTemplates[CONFIG.DEFAULT_STYLE];
  
  let prompt = '';
  
  // Character consistency (critical for multi-scene narratives)
  if (characterContext?.name) {
    prompt += `CHARACTER "${characterContext.name}" with exact visual consistency. `;
    if (characterContext.description) {
      const truncatedDesc = characterContext.description.substring(0, 120);
      prompt += `Appearance: ${truncatedDesc}. `;
    }
  }
  
  // Core scene with optimized structure for Gemini
  prompt += `${styleDescription} depicting: ${description}. `;
  
  // Quality directives optimized for Gemini's understanding
  prompt += 'Cinematic composition, dynamic lighting, rich color palette, sharp focus, professional quality.';
  
  // Ensure prompt stays under limit with safety margin
  if (prompt.length > CONFIG.MAX_PROMPT_LENGTH) {
    const maxDescLength = CONFIG.MAX_PROMPT_LENGTH - 200; // Reserve space for style and quality
    const truncatedDesc = description.substring(0, maxDescLength);
    prompt = `${styleDescription} depicting: ${truncatedDesc}. Professional cinematic quality.`;
  }
  
  return prompt;
};

// Enhanced editing prompts for specific modification types
const createEditingPrompt = (editRequest, sceneContext = {}) => {
  const editTypes = {
    eyes: 'CRITICAL EYES MODIFICATION: Character\'s eyes must be clearly modified as specified. Focus on eye state, expression, and visibility as the primary edit requirement.',
    hair: 'CRITICAL HAIR MODIFICATION: Transform hair dramatically as requested. Hair change must be immediately obvious while maintaining facial features and head shape.',
    expression: 'CRITICAL FACIAL MODIFICATION: Transform facial expression significantly. Focus on mouth, eyebrows, and overall emotional conveyance.',
    clothing: 'CRITICAL CLOTHING MODIFICATION: Replace or modify clothing while maintaining character proportions and pose.',
    background: 'CRITICAL BACKGROUND MODIFICATION: Transform environment while preserving all foreground elements exactly.'
  };
  
  let prompt = 'PROFESSIONAL IMAGE EDITING: Implement the following precise modification: ';
  prompt += `"${editRequest}". `;
  
  // Add specific editing directive based on content
  const editType = Object.keys(editTypes).find(type => 
    editRequest.toLowerCase().includes(type)
  );
  
  if (editType) {
    prompt += editTypes[editType] + ' ';
  }
  
  prompt += 'PRESERVATION REQUIREMENT: Maintain exact character identity, artistic style, lighting, and all elements not specifically targeted for modification. ';
  
  if (sceneContext.sceneNumber) {
    prompt += `Scene ${sceneContext.sceneNumber}. `;
  }
  
  // Character limit safety
  return prompt.length > 1900 ? prompt.substring(0, 1900) : prompt;
};

// Placeholder generation with improved visual design
const generatePlaceholder = (prompt, reason = 'fallback', description = null) => {
  const truncatedPrompt = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;
  const displayText = description || truncatedPrompt;
  
  const colorSchemes = {
    'no-api': { bg: '#e3f2fd', text: '#1565c0', border: '#2196f3' },
    'error': { bg: '#ffebee', text: '#c62828', border: '#f44336' },
    'ai-description': { bg: '#f3e5f5', text: '#7b1fa2', border: '#9c27b0' },
    'fallback': { bg: '#f0f8ff', text: '#333333', border: '#666666' }
  };
  
  const colors = colorSchemes[reason] || colorSchemes.fallback;
  
  const svg = `
    <svg width="${CONFIG.PLACEHOLDER_WIDTH}" height="${CONFIG.PLACEHOLDER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${colors.bg}" stroke="${colors.border}" stroke-width="2"/>
      <text x="50%" y="30%" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${colors.text}">
        StoryMill Image
      </text>
      <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${colors.text}">
        ${reason === 'ai-description' ? 'AI-Enhanced Description' : 'Generated Placeholder'}
      </text>
      <foreignObject x="10%" y="55%" width="80%" height="35%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 12px; color: ${colors.text}; text-align: center; padding: 10px; word-wrap: break-word;">
          ${displayText}
        </div>
      </foreignObject>
    </svg>
  `;
  
  return {
    imageUrl: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'),
    prompt,
    timestamp: new Date().toISOString(),
    id: generateId(),
    provider: 'storymill-placeholder',
    cost: 'free',
    quality: reason === 'ai-description' ? 'enhanced-placeholder' : 'placeholder',
    model: CONFIG.MODEL_NAME,
    description,
    reason,
    width: CONFIG.PLACEHOLDER_WIDTH,
    height: CONFIG.PLACEHOLDER_HEIGHT,
    type: 'placeholder'
  };
};

// Core image generation with intelligent prompt optimization
const generateImage = async (prompt, style = CONFIG.DEFAULT_STYLE, characterContext = null) => {
  try {
    // Use intelligent prompt validation and reduction
    const optimizedPromptInput = await validateAndOptimizePrompt(prompt);
    
    const cleanPrompt = sanitizeText(optimizedPromptInput);
    const finalPrompt = createOptimizedPrompt(cleanPrompt, style, characterContext);
    
    // Additional check in case createOptimizedPrompt makes it too long
    const validatedFinalPrompt = await validateAndOptimizePrompt(finalPrompt);
    
    if (!genAI) {
      console.warn('GenAI not available, generating placeholder');
      return generatePlaceholder(validatedFinalPrompt, 'no-api');
    }
    
    console.log(`Generating image: "${cleanPrompt.substring(0, 50)}..."`);
    if (characterContext?.name) {
      console.log(`Character consistency: ${characterContext.name}`);
    }
    
    // CRITICAL: Use proper image generation format for Gemini
    const imageGenerationPrompt = formatImageGenerationPrompt(validatedFinalPrompt);
    console.log(`🎨 Formatted prompt for image generation: "${imageGenerationPrompt.substring(0, 80)}..."`);
    
    const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
    const response = await retryWithBackoff(() => model.generateContent([imageGenerationPrompt]));
    
    console.log('📊 Gemini response structure:', {
      hasResponse: !!response?.response,
      hasCandidates: !!response?.response?.candidates,
      candidatesLength: response?.response?.candidates?.length || 0,
      firstCandidateParts: response?.response?.candidates?.[0]?.content?.parts?.length || 0
    });
    
    // Process Gemini response with detailed logging
    const candidates = response?.response?.candidates;
    if (candidates?.[0]?.content?.parts) {
      const parts = candidates[0].content.parts;
      console.log(`🔍 Processing ${parts.length} response parts`);
      
      // First, look for any image data
      for (const [index, part] of parts.entries()) {
        console.log(`Part ${index}: has inlineData: ${!!part.inlineData}, has text: ${!!part.text}`);
        
        if (part.inlineData?.data) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || CONFIG.DEFAULT_MIME_TYPE;
          const imageUrl = `data:${mimeType};base64,${imageData}`;
          
          console.log('✅ Generated actual image with Gemini');
          return {
            imageUrl,
            prompt: validatedFinalPrompt,
            timestamp: new Date().toISOString(),
            id: generateId(),
            provider: 'gemini-2.5-flash-image-preview',
            cost: 'medium',
            quality: 'high',
            model: CONFIG.MODEL_NAME,
            width: CONFIG.PLACEHOLDER_WIDTH,
            height: CONFIG.PLACEHOLDER_HEIGHT,
            type: 'generated'
          };
        }
      }
      
      // If no image found, check for text responses
      for (const [index, part] of parts.entries()) {
        if (part.text) {
          console.warn(`⚠️ Part ${index} - Gemini returned text instead of image: ${part.text.substring(0, 100)}...`);
          
          // Try different prompt strategies
          const retryStrategies = [
            `Create a visual illustration: ${validatedFinalPrompt}`,
            `Produce an image showing: ${validatedFinalPrompt}`,
            `Draw a picture depicting: ${validatedFinalPrompt}`
          ];
          
          for (const [strategyIndex, retryPrompt] of retryStrategies.entries()) {
            console.log(`🔄 Retry strategy ${strategyIndex + 1}: "${retryPrompt.substring(0, 50)}..."`);
            
            try {
              const retryResponse = await retryWithBackoff(() => model.generateContent([retryPrompt]));
              const retryCandidates = retryResponse?.response?.candidates;
              
              if (retryCandidates?.[0]?.content?.parts) {
                for (const retryPart of retryCandidates[0].content.parts) {
                  if (retryPart.inlineData?.data) {
                    const imageData = retryPart.inlineData.data;
                    const mimeType = retryPart.inlineData.mimeType || CONFIG.DEFAULT_MIME_TYPE;
                    const imageUrl = `data:${mimeType};base64,${imageData}`;
                    
                    console.log(`✅ Generated actual image with Gemini (retry strategy ${strategyIndex + 1})`);
                    return {
                      imageUrl,
                      prompt: validatedFinalPrompt,
                      timestamp: new Date().toISOString(),
                      id: generateId(),
                      provider: 'gemini-2.5-flash-image-preview',
                      cost: 'medium',
                      quality: 'high',
                      model: CONFIG.MODEL_NAME,
                      width: CONFIG.PLACEHOLDER_WIDTH,
                      height: CONFIG.PLACEHOLDER_HEIGHT,
                      type: 'generated'
                    };
                  }
                }
              }
            } catch (retryError) {
              console.error(`🔄 Retry strategy ${strategyIndex + 1} failed:`, retryError.message);
              continue; // Try next strategy
            }
          }
          
          // If all retries fail, create placeholder with text description
          console.log('❌ All retry strategies failed, creating description placeholder');
          return generatePlaceholder(validatedFinalPrompt, 'ai-description', part.text);
        }
      }
    }
    
    console.warn('No image data in Gemini response');
    return generatePlaceholder(validatedFinalPrompt, 'no-image-data');
    
  } catch (error) {
    console.error('Image generation error:', error.message);
    return generatePlaceholder(prompt, 'error', `Generation failed: ${error.message}`);
  }
};

// Enhanced AI image editing with intelligent prompt optimization
const editImageWithAI = async (originalImageBase64, editPrompt, sceneContext = {}) => {
  try {
    // Use intelligent prompt validation and reduction
    const optimizedEditPrompt = await validateAndOptimizePrompt(editPrompt);
    
    if (!genAI) {
      throw new Error('Google GenAI not available for image editing');
    }
    
    if (isPlaceholderImage(originalImageBase64)) {
      throw new Error('Cannot edit placeholder images. Please wait for actual image generation or create a new story.');
    }
    
    // Validate supported image format
    if (!originalImageBase64.startsWith('data:image/') || 
        !['/png', '/jpeg', '/jpg', '/webp'].some(format => 
          originalImageBase64.includes(`data:image${format}`))) {
      throw new Error('Unsupported image format. Only PNG, JPEG, and WebP images can be edited.');
    }
    
    console.log(`Editing image with NanoBanana: "${optimizedEditPrompt}"`);
    
    const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
    const editingPrompt = createEditingPrompt(optimizedEditPrompt, sceneContext);
    
    // Additional optimization for the editing prompt if needed
    const finalEditingPrompt = await validateAndOptimizePrompt(editingPrompt);
    
    const imageData = {
      inlineData: {
        data: originalImageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        mimeType: 'image/png'
      }
    };
    
    const response = await retryWithBackoff(() => 
      model.generateContent([finalEditingPrompt, imageData])
    );
    
    // Extract edited image
    const parts = response?.response?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          const editedImageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          
          console.log('NanoBanana edit completed successfully');
          return {
            success: true,
            imageData: editedImageBase64,
            editPrompt: optimizedEditPrompt,
            sceneContext,
            generatedAt: new Date().toISOString(),
            editId: generateId()
          };
        }
      }
    }
    
    throw new Error('No edited image received from NanoBanana');
    
  } catch (error) {
    console.error('NanoBanana edit failed:', error.message);
    
    // Fallback to generating new image for placeholder issues
    if (error.message.includes('placeholder') || error.message.includes('Unsupported')) {
      console.log('Attempting to generate new image instead of editing placeholder...');
      
      try {
        const newImage = await generateImage(
          `${editPrompt} in a storybook illustration style`,
          CONFIG.DEFAULT_STYLE
        );
        
        return {
          success: true,
          imageData: newImage.imageUrl,
          editPrompt,
          sceneContext,
          generatedAt: new Date().toISOString(),
          editId: generateId(),
          fallbackType: 'generated_new_image',
          message: 'Generated new image instead of editing placeholder'
        };
      } catch (fallbackError) {
        console.error('Fallback generation failed:', fallbackError.message);
      }
    }
    
    throw new Error(`Image editing failed: ${error.message}`);
  }
};

// NEW: Intelligent uploaded image selection for scenes
const selectBestUploadedImageForScene = (scene, uploadedImageContexts) => {
  if (!uploadedImageContexts || uploadedImageContexts.length === 0) {
    return null;
  }

  // If only one image, use it for all scenes
  if (uploadedImageContexts.length === 1) {
    return uploadedImageContexts[0];
  }

  // Try to match scene context with image context
  const sceneText = (scene.description + ' ' + scene.visualPrompt + ' ' + scene.setting).toLowerCase();
  
  let bestMatch = uploadedImageContexts[0];
  let highestScore = 0;

  for (const imageContext of uploadedImageContexts) {
    let score = 0;
    const imageDescription = (
      imageContext.description + ' ' + 
      (imageContext.subjects?.join(' ') || '') + ' ' + 
      imageContext.setting + ' ' + 
      imageContext.mood
    ).toLowerCase();

    // Score based on keyword matches
    const keywords = imageDescription.split(' ').filter(word => word.length > 3);
    for (const keyword of keywords) {
      if (sceneText.includes(keyword)) {
        score += 1;
      }
    }

    // Bonus for mood matching
    if (imageContext.mood && scene.mood && imageContext.mood === scene.mood) {
      score += 2;
    }

    // Bonus for setting matching
    if (imageContext.setting && scene.setting && 
        imageContext.setting.toLowerCase().includes(scene.setting.toLowerCase())) {
      score += 2;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = imageContext;
    }
  }

  return bestMatch;
};

// NEW: Create contextual editing instruction for scene integration with intelligent optimization
const createSceneContextualEditPrompt = async (scene, imageContext) => {
  const baseEditPrompt = `SCENE INTEGRATION EDITING: Transform the uploaded image to perfectly fit this story scene context.

SCENE DETAILS:
- Description: ${scene.description}
- Setting: ${scene.setting}
- Mood: ${scene.mood}
- Time of Day: ${scene.timeOfDay}
- Weather: ${scene.weather}
- Environment: ${scene.environment}

IMAGE CONTEXT:
- Current subjects: ${imageContext.subjects?.join(', ') || 'uploaded subject'}
- Current setting: ${imageContext.setting}
- Current mood: ${imageContext.mood}

EDITING REQUIREMENTS:
1. PRESERVE the main subject(s) from the uploaded image - maintain their identity, recognizable features, and core appearance
2. ADAPT the background/setting to match: ${scene.setting}
3. ADJUST lighting and atmosphere to match: ${scene.mood} mood during ${scene.timeOfDay}
4. MODIFY weather/environmental effects to show: ${scene.weather} weather
5. ENSURE the subject fits naturally into the story scene while maintaining their original character

SPECIFIC SCENE ACTION: ${scene.visualPrompt}

The edited image should show the uploaded subject(s) seamlessly integrated into the new scene context while preserving their identity and making the scene look cohesive and story-appropriate.`;

  // Use intelligent prompt reduction if needed
  return await validateAndOptimizePrompt(baseEditPrompt);
};

// ENHANCED: Scene processing with proper uploaded image integration
const generateSceneImages = async (scenes, characterDescriptions = {}, uploadedImages = [], uploadedImageContexts = []) => {
  try {
    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error('Invalid scenes: must be non-empty array');
    }
    
    console.log(`Processing ${scenes.length} scenes with ${uploadedImages?.length || 0} uploaded images`);
    
    const generatedScenes = [];
    const characterPrompts = createCharacterPrompts(characterDescriptions);
    const referenceImages = {}; // Store character references
    const hasUploadedImages = uploadedImages?.length > 0 && uploadedImageContexts?.length > 0;
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      
      if (!scene?.visualPrompt) {
        console.warn(`Invalid scene at index ${i}, skipping`);
        continue;
      }
      
      console.log(`Processing scene ${scene.sceneNumber || i + 1}: ${scene.visualPrompt.substring(0, 50)}...`);
      
      let image;
      
      try {
        // ENHANCED LOGIC: Always try to use uploaded images if available
        if (hasUploadedImages) {
          // Select the best uploaded image for this scene
          const selectedImageContext = selectBestUploadedImageForScene(scene, uploadedImageContexts);
          
          if (selectedImageContext && selectedImageContext.originalImage) {
            console.log(`Using uploaded image ${selectedImageContext.imageIndex + 1} for scene ${i + 1}`);
            
            // Create contextual edit prompt for this specific scene (now async)
            const contextualEditPrompt = await createSceneContextualEditPrompt(scene, selectedImageContext);
            
            // Prepare the image data properly
            let imageBase64;
            if (selectedImageContext.originalImage.base64) {
              imageBase64 = selectedImageContext.originalImage.base64;
            } else if (selectedImageContext.originalImage.data) {
              // If it's raw base64, add data URL prefix
              const mimeType = selectedImageContext.originalImage.mimeType || 'image/png';
              imageBase64 = selectedImageContext.originalImage.data.startsWith('data:') ? 
                selectedImageContext.originalImage.data : 
                `data:${mimeType};base64,${selectedImageContext.originalImage.data}`;
            } else {
              throw new Error('Invalid image data in uploaded image context');
            }
            
            // Edit the uploaded image to fit this scene
            const editResult = await editImageWithAI(
              imageBase64,
              contextualEditPrompt,
              scene
            );
            
            if (editResult.success) {
              image = {
                imageUrl: editResult.imageData,
                prompt: contextualEditPrompt,
                timestamp: editResult.generatedAt,
                id: editResult.editId,
                provider: 'gemini-2.5-flash-image-preview',
                cost: 'medium',
                quality: 'high',
                model: CONFIG.MODEL_NAME,
                type: 'uploaded-edited',
                originalImageIndex: selectedImageContext.imageIndex,
                editPrompt: contextualEditPrompt,
                sceneIntegration: true
              };
            } else {
              throw new Error('Failed to edit uploaded image for scene context');
            }
          } else {
            throw new Error('No suitable uploaded image found for scene');
          }
        } 
        // Fallback to character consistency or new generation
        else if (i > 0 && Object.keys(characterDescriptions).length > 0) {
          image = await processSceneWithCharacterConsistency(scene, characterPrompts, referenceImages);
        } else {
          image = await processNewSceneImage(scene, characterPrompts);
        }
        
        // Store reference for future consistency (only for generated images, not edited uploads)
        if (image.type !== 'uploaded-edited' && scene.characters?.length > 0) {
          scene.characters.forEach(character => {
            referenceImages[character] = image.imageUrl;
          });
        }
        
      } catch (sceneError) {
        console.error(`Error processing scene ${i + 1}:`, sceneError.message);
        
        // If uploaded image editing fails, try generating a new image
        if (hasUploadedImages && sceneError.message.includes('uploaded')) {
          console.log('Uploaded image editing failed, generating new image for scene...');
          try {
            image = await processNewSceneImage(scene, characterPrompts);
          } catch (fallbackError) {
            image = generatePlaceholder(scene.visualPrompt, 'error', `Scene processing failed: ${sceneError.message}`);
          }
        } else {
          image = generatePlaceholder(scene.visualPrompt, 'error', `Scene processing failed: ${sceneError.message}`);
        }
      }
      
      generatedScenes.push({
        ...scene,
        image,
        enhancedPrompt: scene.visualPrompt,
        processingIndex: i,
        usedUploadedImage: image.type === 'uploaded-edited'
      });
      
      // Smart rate limiting based on provider
      const delay = image.provider === 'storymill-placeholder' ? 100 : CONFIG.RATE_LIMIT_DELAY;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.log(`Successfully processed ${generatedScenes.length} scene images`);
    const uploadedImageScenes = generatedScenes.filter(scene => scene.usedUploadedImage).length;
    if (uploadedImageScenes > 0) {
      console.log(`${uploadedImageScenes} scenes used edited uploaded images`);
    }
    
    return generatedScenes;
    
  } catch (error) {
    console.error('Scene image generation failed:', error.message);
    throw new Error(`Failed to generate scene images: ${error.message}`);
  }
};

// Character consistency with intelligent prompt optimization
const ensureCharacterConsistency = async (referenceImageUrl, newPrompt, characterName, characterDescription = null) => {
  try {
    const optimizedPrompt = await validateAndOptimizePrompt(newPrompt);
    
    if (!characterName || typeof characterName !== 'string') {
      console.warn('Invalid character name, proceeding without character consistency');
      return generateImage(optimizedPrompt);
    }
    
    if (!genAI) {
      console.warn('GenAI not available, using enhanced text prompt for consistency');
      return generateImageWithTextConsistency(optimizedPrompt, characterName, characterDescription);
    }
    
    console.log(`Ensuring character consistency for: ${characterName}`);
    
    // Process reference image if available
    if (referenceImageUrl?.startsWith('data:image/')) {
      try {
        const base64Image = referenceImageUrl.split(',')[1];
        validateImageData(base64Image);
        
        const consistencyPrompt = `CHARACTER CONSISTENCY ANALYSIS for "${characterName}":

REFERENCE: Analyze this character's exact visual features
TARGET SCENE: ${newPrompt}

REQUIRED ANALYSIS:
1. FACIAL FEATURES: Eye shape/color, nose, mouth, face shape, skin tone
2. HAIR: Color, texture, length, style
3. CLOTHING: Current outfit, style preferences  
4. BODY TYPE: Build, posture, distinctive characteristics
5. ART STYLE: Line weight, shading, color palette

CONSISTENCY DIRECTIVE: Create specifications ensuring identical character appearance in new scene while adapting pose/expression to context: ${newPrompt}

CRITICAL: Character must be instantly recognizable. Maintain all identifying features exactly.`;
        
        const imageData = {
          inlineData: {
            data: base64Image,
            mimeType: detectMimeType(base64Image)
          }
        };
        
        const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
        const response = await retryWithBackoff(() => 
          model.generateContent([consistencyPrompt, imageData])
        );
        
        const consistencyGuidelines = response.response.text();
        console.log('Generated character consistency guidelines');
        
        const characterContext = {
          name: characterName,
          description: characterDescription,
          consistencyGuidelines,
          previousAppearance: true
        };
        
        const enhancedPrompt = `EXACT CHARACTER MATCH: ${characterName} must appear exactly as in reference. ${newPrompt}. GUIDELINES: ${consistencyGuidelines.substring(0, 600)}`;
        const newImage = await generateImage(enhancedPrompt, CONFIG.DEFAULT_STYLE, characterContext);
        
        return {
          ...newImage,
          characterName,
          referenceImage: referenceImageUrl,
          consistencyGuidelines,
          method: 'ai-guided-consistency',
          hasReference: true,
          consistencyScore: 'high'
        };
        
      } catch (referenceError) {
        console.warn('Reference image processing failed:', referenceError.message);
      }
    }
    
    return generateImageWithTextConsistency(newPrompt, characterName, characterDescription);
    
  } catch (error) {
    console.error('Character consistency error:', error.message);
    
    try {
      return generateImage(newPrompt);
    } catch (fallbackError) {
      return generatePlaceholder(newPrompt, 'error', `Character consistency failed: ${error.message}`);
    }
  }
};

// Text-based character consistency fallback
const generateImageWithTextConsistency = async (newPrompt, characterName, characterDescription = null) => {
  let consistencyPrompt = `CHARACTER CONSISTENCY: "${characterName}" must maintain exact visual identity. `;
  
  if (characterDescription) {
    consistencyPrompt += `Specifications: ${characterDescription}. `;
  }
  
  consistencyPrompt += `SCENE: ${newPrompt}. REQUIREMENTS: Same facial features, hair, clothing style, body type, artistic style. Character must be instantly recognizable from previous scenes while adapting to new context.`;
  
  const characterContext = {
    name: characterName,
    description: characterDescription,
    previousAppearance: false
  };
  
  const image = await generateImage(consistencyPrompt, CONFIG.DEFAULT_STYLE, characterContext);
  
  return {
    ...image,
    characterName,
    method: 'text-based-consistency',
    hasReference: false,
    consistencyScore: 'medium'
  };
};

// Helper functions for scene processing
const createCharacterPrompts = (characterDescriptions) => {
  if (!characterDescriptions || typeof characterDescriptions !== 'object') {
    return '';
  }
  
  return Object.entries(characterDescriptions)
    .filter(([name, desc]) => name && desc)
    .map(([name, desc]) => `${name}: ${desc}`)
    .join(', ');
};

const processSceneWithCharacterConsistency = async (scene, characterPrompts, referenceImages) => {
  const mainCharacter = scene.characters?.[0];
  
  if (mainCharacter && referenceImages[mainCharacter]) {
    return ensureCharacterConsistency(referenceImages[mainCharacter], scene.visualPrompt, mainCharacter);
  }
  
  return processNewSceneImage(scene, characterPrompts);
};

const processNewSceneImage = async (scene, characterPrompts) => {
  let enhancedPrompt = scene.visualPrompt;
  
  if (characterPrompts) {
    enhancedPrompt += `, featuring characters: ${characterPrompts}`;
  }
  
  enhancedPrompt += ', consistent art style, maintain visual continuity';
  return generateImage(enhancedPrompt);
};

// Legacy function wrappers for backwards compatibility
const editUploadedImage = async (imageBase64, editPrompt, sceneContext) => {
  try {
    validateImageData(imageBase64);
    const optimizedEditPrompt = await validateAndOptimizePrompt(editPrompt);
    
    if (!genAI) {
      console.warn('Gemini not available, returning original with suggestions');
      return createEditFallback(imageBase64, optimizedEditPrompt, sceneContext, 'no-api');
    }
    
    console.log(`Analyzing image for edit: "${optimizedEditPrompt.substring(0, 50)}..."`);
    
    const analysisPrompt = `Analyze this image for promotional story editing.

Scene Context: ${sceneContext}
Edit Request: ${optimizedEditPrompt}

Provide:
1. Current image description
2. Specific editing suggestions for story scene
3. Product recognition maintenance methods
4. Color, lighting, composition recommendations
5. Props/background modifications needed

Be specific and actionable.`;
    
    const prompt = [
      { text: analysisPrompt },
      {
        inlineData: {
          mimeType: detectMimeType(imageBase64),
          data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      }
    ];
    
    const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
    const response = await retryWithBackoff(() => model.generateContent(prompt));
    const editingSuggestions = response.response.text();
    
    console.log('Generated editing analysis for uploaded image');
    return createEnhancedImageWithSuggestions(imageBase64, optimizedEditPrompt, sceneContext, editingSuggestions);
    
  } catch (error) {
    console.error('Image editing error:', error.message);
    return createEditFallback(imageBase64, optimizedEditPrompt, sceneContext, 'error', error.message);
  }
};

const createEnhancedImageWithSuggestions = (originalBase64, editPrompt, sceneContext, suggestions) => ({
  imageUrl: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
  originalImage: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
  editPrompt,
  sceneContext,
  editingSuggestions: suggestions,
  timestamp: new Date().toISOString(),
  id: generateId(),
  provider: 'gemini-analysis',
  editType: 'ai-analysis',
  model: CONFIG.MODEL_NAME,
  status: 'analyzed',
  hasOriginal: true
});

const createEditFallback = (originalBase64, editPrompt, sceneContext, reason, errorMessage = null) => {
  const fallbackSuggestions = errorMessage ?
    `Error: ${errorMessage}. Please try again or use manual editing tools.` :
    `AI analysis unavailable. Manual editing suggestions: Adjust lighting, colors, and composition for scene: "${sceneContext}". Apply edit: "${editPrompt}" using image editing software.`;
  
  return {
    imageUrl: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
    originalImage: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
    editPrompt,
    sceneContext,
    editingSuggestions: fallbackSuggestions,
    timestamp: new Date().toISOString(),
    id: generateId(),
    provider: 'fallback',
    editType: 'manual-suggestions',
    model: 'none',
    status: reason === 'error' ? 'error' : 'fallback',
    hasOriginal: true,
    error: errorMessage
  };
};

// Legacy function - simplified for backwards compatibility with intelligent prompt optimization
const editImage = async (originalImageUrl, editPrompt, originalPrompt = '') => {
  try {
    const optimizedEditPrompt = await validateAndOptimizePrompt(editPrompt);
    
    if (!originalImageUrl) {
      throw new Error('Original image URL required');
    }
    
    // Extract base64 data
    const [, base64Image] = originalImageUrl.startsWith('data:image/') ? 
      originalImageUrl.split(',') : [null, originalImageUrl];
    
    if (!base64Image) {
      throw new Error('Invalid image format');
    }
    
    const mimeType = originalImageUrl.startsWith('data:image/') ? 
      originalImageUrl.match(/data:([^;]+)/)?.[1] || CONFIG.DEFAULT_MIME_TYPE :
      detectMimeType(base64Image);
    
    validateImageData(base64Image);
    
    if (!genAI) {
      console.warn('GenAI not available, generating modified image');
      const modifiedPrompt = originalPrompt ? `${originalPrompt}, ${optimizedEditPrompt}` : optimizedEditPrompt;
      return generateImage(modifiedPrompt);
    }
    
    const editingPrompt = `Analyze and suggest edits for: "${optimizedEditPrompt}"
    Original context: ${originalPrompt || 'None'}
    
    Provide: description, edit steps, consistency methods, technical recommendations.`;
    
    const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
    const response = await retryWithBackoff(() => 
      model.generateContent([
        { text: editingPrompt },
        { inlineData: { mimeType, data: base64Image } }
      ])
    );
    
    const editingSuggestions = response.response.text();
    
    return {
      imageUrl: `data:${mimeType};base64,${base64Image}`,
      originalImage: `data:${mimeType};base64,${base64Image}`,
      prompt: `${originalPrompt} + ${optimizedEditPrompt}`,
      editPrompt: optimizedEditPrompt,
      originalPrompt,
      editingSuggestions,
      timestamp: new Date().toISOString(),
      id: generateId(),
      provider: 'gemini-edit-analysis',
      editType: 'ai-guided-edit',
      model: CONFIG.MODEL_NAME,
      status: 'analyzed',
      hasOriginal: true
    };
    
  } catch (error) {
    console.error('Image editing error:', error.message);
    
    try {
      const modifiedPrompt = originalPrompt ? `${originalPrompt}, ${optimizedEditPrompt}` : optimizedEditPrompt;
      return generateImage(modifiedPrompt);
    } catch (fallbackError) {
      console.error('Fallback generation failed:', fallbackError.message);
      return generatePlaceholder(`${originalPrompt} + ${optimizedEditPrompt}`, 'error', `Edit failed: ${error.message}`);
    }
  }
};

module.exports = {
  generateImage,
  editImage,
  editUploadedImage,
  editImageWithAI,
  generateSceneImages,
  ensureCharacterConsistency,
  createOptimizedPrompt,
  createEditingPrompt,
  validateAndOptimizePrompt, // Intelligent validation with prompt reduction
  reducePromptWithGemini, // New prompt reduction function
  formatImageGenerationPrompt, // New helper for explicit image requests
  validateImageData,
  detectMimeType,
  generatePlaceholder,
  getConfig: () => ({ ...CONFIG })
};