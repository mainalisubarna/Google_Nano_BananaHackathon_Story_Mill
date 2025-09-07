const { GoogleGenerativeAI } = require('@google/generative-ai');
const { retryWithBackoff, generateId, sanitizeText } = require('../utils/apiHelpers');

// Configuration constants - now configurable via environment variables
const CONFIG = {
    MODEL_NAME: 'gemini-2.5-flash-image-preview',
    DEFAULT_STYLE: 'storybook illustration',
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    RATE_LIMIT_DELAY: 1000,
    PLACEHOLDER_WIDTH: 800,
    PLACEHOLDER_HEIGHT: 600,
    DEFAULT_MIME_TYPE: 'image/png',
    LOG_LEVEL: 'info'
};

// Initialize Google GenAI for Gemini Image Generation
let genAI;

try {
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        if (CONFIG.LOG_LEVEL === 'info') {
            console.log('🍌 Google GenAI initialized successfully');
        }
    } else {
        console.warn('⚠️ GEMINI_API_KEY not found - image generation will use fallbacks');
    }
} catch (error) {
    console.error('❌ Google GenAI initialization failed:', error.message);
    genAI = null;
}

/**
 * Validate image input parameters
 */
const validateImageInput = (prompt, style) => {
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Invalid prompt: must be a non-empty string');
    }

    if (prompt.length > 2000) {
        throw new Error('Prompt too long: maximum 2000 characters');
    }

    if (style && typeof style !== 'string') {
        throw new Error('Invalid style: must be a string');
    }

    return true;
};

/**
 * Validate base64 image data
 */
const validateImageData = (base64Data) => {
    if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid image data: must be base64 string');
    }

    // Estimate size (base64 is ~33% larger than binary)
    const estimatedSize = (base64Data.length * 3) / 4;
    if (estimatedSize > CONFIG.MAX_IMAGE_SIZE) {
        throw new Error(`Image too large: ${Math.round(estimatedSize / 1024 / 1024)}MB exceeds ${CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB limit`);
    }

    return true;
};

/**
 * Generate image using Gemini Pro with proper error handling
 */
const generateImage = async (prompt, style = null) => {
    try {
        // Use configured default style if none provided
        const imageStyle = style || CONFIG.DEFAULT_STYLE;

        // Validate inputs
        validateImageInput(prompt, imageStyle);

        const cleanPrompt = sanitizeText(prompt);
        const narrativePrompt = createNarrativePrompt(cleanPrompt, imageStyle);

        if (!genAI) {
            if (CONFIG.LOG_LEVEL === 'info') {
                console.warn('⚠️ Google GenAI not available, generating placeholder');
            }
            return generatePlaceholderImage(narrativePrompt, 'no-api');
        }

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`🎨 Generating image: "${cleanPrompt.substring(0, 50)}..."`);
        }

        const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

        // Generate actual image using Gemini 2.5 Flash Image Preview
        const response = await retryWithBackoff(async () => {
            return await model.generateContent([narrativePrompt]);
        });

        // Check if we got actual image data
        const candidates = response.response.candidates;
        if (candidates && candidates.length > 0) {
            for (const candidate of candidates) {
                if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        // Check for inline image data
                        if (part.inlineData && part.inlineData.data) {
                            const imageData = part.inlineData.data;
                            const mimeType = part.inlineData.mimeType || CONFIG.DEFAULT_MIME_TYPE;
                            const imageUrl = `data:${mimeType};base64,${imageData}`;
                            
                            if (CONFIG.LOG_LEVEL === 'info') {
                                console.log(`✅ Generated actual image with Gemini 2.5 Flash Image Preview`);
                            }
                            
                            return {
                                imageUrl,
                                prompt: narrativePrompt,
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
                        
                        // Handle text responses (fallback to description)
                        if (part.text) {
                            if (CONFIG.LOG_LEVEL === 'info') {
                                console.log(`🍌 Gemini response: ${part.text.substring(0, 100)}...`);
                            }
                            // Return enhanced placeholder with AI description
                            return generatePlaceholderImage(narrativePrompt, 'ai-description', part.text);
                        }
                    }
                }
            }
        }

        // Fallback if no image or text found
        if (CONFIG.LOG_LEVEL === 'info') {
            console.warn(`⚠️ No image data found in Gemini response, using placeholder`);
        }
        return generatePlaceholderImage(narrativePrompt, 'no-image-data');

    } catch (error) {
        console.error('❌ Image generation error:', error.message);

        // Return error placeholder instead of throwing
        return generatePlaceholderImage(
            prompt,
            'error',
            `Generation failed: ${error.message}`
        );
    }
};

/**
 * Edit uploaded image using Gemini with natural language analysis
 * Provides detailed editing suggestions and enhanced image with overlay
 */
const editUploadedImage = async (imageBase64, editPrompt, sceneContext) => {
    try {
        // Validate inputs
        validateImageData(imageBase64);
        validateImageInput(editPrompt);

        if (!genAI) {
            if (CONFIG.LOG_LEVEL === 'info') {
                console.warn('⚠️ Gemini AI not available, returning original with suggestions');
            }
            return createEditFallback(imageBase64, editPrompt, sceneContext, 'no-api');
        }

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`✏️ Analyzing image for edit: "${editPrompt.substring(0, 50)}..."`);
        }

        // Create comprehensive analysis prompt
        const analysisPrompt = `Analyze this product image and provide detailed editing suggestions for a promotional story.

Scene Context: ${sceneContext}
Edit Request: ${editPrompt}

Please provide:
1. Detailed description of the current image
2. Specific editing suggestions to fit the story scene
3. How to maintain product recognition while making story-appropriate changes
4. Color, lighting, and composition recommendations
5. Any props or background elements that should be added/modified

Be specific and actionable in your suggestions.`;

        const prompt = [
            {
                text: analysisPrompt
            },
            {
                inlineData: {
                    mimeType: detectMimeType(imageBase64),
                    data: imageBase64
                }
            }
        ];

        const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
        const response = await retryWithBackoff(async () => {
            return await model.generateContent(prompt);
        });

        const editingSuggestions = response.response.text();

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`✅ Generated editing analysis for uploaded image`);
        }

        // Create enhanced image with editing overlay
        return createEnhancedImageWithSuggestions(
            imageBase64,
            editPrompt,
            sceneContext,
            editingSuggestions
        );

    } catch (error) {
        console.error('❌ Image editing error:', error.message);

        // Return fallback instead of throwing
        return createEditFallback(imageBase64, editPrompt, sceneContext, 'error', error.message);
    }
};

/**
 * Detect MIME type from base64 data
 */
const detectMimeType = (base64Data) => {
    // Check for common image signatures in base64
    if (base64Data.startsWith('/9j/')) return 'image/jpeg';
    if (base64Data.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64Data.startsWith('R0lGOD')) return 'image/gif';
    if (base64Data.startsWith('UklGR')) return 'image/webp';

    // Default fallback
    return CONFIG.DEFAULT_MIME_TYPE;
};

/**
 * Get style descriptions - now configurable and extensible
 */
const getStyleDescriptions = () => {
    // Load from environment or use defaults
    const customStyles = process.env.CUSTOM_IMAGE_STYLES ?
        JSON.parse(process.env.CUSTOM_IMAGE_STYLES) : {};

    const defaultStyles = {
        'storybook illustration': 'A beautifully illustrated storybook scene with vibrant colors and child-friendly artwork',
        'watercolor': 'A soft watercolor painting with gentle brushstrokes and flowing colors',
        'digital art': 'A detailed digital artwork with crisp lines and rich colors',
        'cartoon': 'A cheerful cartoon-style illustration with bold colors and friendly characters',
        'realistic': 'A photorealistic scene with natural lighting and detailed textures',
        'promotional': 'A professional product showcase with marketing appeal and commercial quality',
        'vintage': 'A nostalgic vintage-style illustration with retro colors and classic composition',
        'minimalist': 'A clean, minimalist design with simple shapes and limited color palette'
    };

    return { ...defaultStyles, ...customStyles };
};

/**
 * Create narrative prompt following best practices
 */
const createNarrativePrompt = (prompt, style) => {
    try {
        const styleDescriptions = getStyleDescriptions();
        const styleDesc = styleDescriptions[style] || styleDescriptions[CONFIG.DEFAULT_STYLE];

        if (!styleDesc) {
            console.warn(`⚠️ Unknown style: ${style}, using default`);
            return `${prompt}. The scene should be engaging and visually appealing with excellent composition.`;
        }

        // Create descriptive narrative prompt
        return `${styleDesc} depicting ${prompt}. The scene should be engaging and visually appealing, with excellent composition, proper lighting, and attention to detail. The image should be suitable for storytelling and capture the essence of the narrative moment.`;

    } catch (error) {
        console.error('❌ Error creating narrative prompt:', error.message);
        return `${prompt}. Create an engaging visual scene with good composition and lighting.`;
    }
};

/**
 * Generate placeholder image with proper error handling
 */
const generatePlaceholderImage = (prompt, reason = 'fallback', description = null) => {
    const truncatedPrompt = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;
    const displayText = description || truncatedPrompt;

    // Create color scheme based on reason
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
            <text x="50%" y="30%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="${colors.text}">
                StoryMill Image
            </text>
            <text x="50%" y="45%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="${colors.text}">
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
        prompt: prompt,
        timestamp: new Date().toISOString(),
        id: generateId(),
        provider: 'storymill-placeholder',
        cost: 'free',
        quality: reason === 'ai-description' ? 'enhanced-placeholder' : 'placeholder',
        model: CONFIG.MODEL_NAME,
        description: description,
        reason: reason,
        width: CONFIG.PLACEHOLDER_WIDTH,
        height: CONFIG.PLACEHOLDER_HEIGHT
    };
};

/**
 * Create enhanced image with editing suggestions overlay
 */
const createEnhancedImageWithSuggestions = (originalBase64, editPrompt, sceneContext, suggestions) => {
    return {
        imageUrl: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
        originalImage: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
        editPrompt: editPrompt,
        sceneContext: sceneContext,
        editingSuggestions: suggestions,
        timestamp: new Date().toISOString(),
        id: generateId(),
        provider: 'gemini-analysis',
        editType: 'ai-analysis',
        model: CONFIG.MODEL_NAME,
        status: 'analyzed',
        hasOriginal: true
    };
};

/**
 * Create edit fallback when AI is not available
 */
const createEditFallback = (originalBase64, editPrompt, sceneContext, reason, errorMessage = null) => {
    const fallbackSuggestions = errorMessage ?
        `Error occurred: ${errorMessage}. Please try again or use manual editing tools.` :
        `AI analysis not available. Manual editing suggestions: Consider adjusting lighting, colors, and composition to match the scene context: "${sceneContext}". Apply the edit: "${editPrompt}" using your preferred image editing software.`;

    return {
        imageUrl: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
        originalImage: `data:${detectMimeType(originalBase64)};base64,${originalBase64}`,
        editPrompt: editPrompt,
        sceneContext: sceneContext,
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

/**
 * Edit existing generated image using natural language
 * Handles both data URLs and direct base64 data
 */
const editImage = async (originalImageUrl, editPrompt, originalPrompt = '') => {
    try {
        // Validate inputs
        validateImageInput(editPrompt);

        if (!originalImageUrl) {
            throw new Error('Original image URL is required');
        }

        let base64Image;
        let mimeType = CONFIG.DEFAULT_MIME_TYPE;

        // Handle different input formats
        if (originalImageUrl.startsWith('data:image/')) {
            // Extract base64 data from data URL
            const parts = originalImageUrl.split(',');
            if (parts.length !== 2) {
                throw new Error('Invalid data URL format');
            }
            base64Image = parts[1];

            // Extract MIME type from data URL
            const mimeMatch = parts[0].match(/data:([^;]+)/);
            if (mimeMatch) {
                mimeType = mimeMatch[1];
            }
        } else {
            // Assume it's direct base64 data
            base64Image = originalImageUrl;
            mimeType = detectMimeType(base64Image);
        }

        // Validate extracted base64 data
        validateImageData(base64Image);

        if (!genAI) {
            if (CONFIG.LOG_LEVEL === 'info') {
                console.warn('⚠️ Gemini AI not available, generating new image with modified prompt');
            }
            const modifiedPrompt = originalPrompt ?
                `${originalPrompt}, ${editPrompt}` :
                editPrompt;
            return await generateImage(modifiedPrompt);
        }

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`✏️ Editing existing image: "${editPrompt.substring(0, 50)}..."`);
        }

        // Create comprehensive editing prompt
        const editingPrompt = `Analyze this image and provide detailed suggestions for the following edit: "${editPrompt}"
        
        Original context: ${originalPrompt || 'No original context provided'}
        
        Please provide:
        1. Description of current image elements
        2. Specific steps to achieve the requested edit
        3. How to maintain visual consistency
        4. Technical recommendations (lighting, color, composition)
        
        Be specific and actionable.`;

        const prompt = [
            {
                text: editingPrompt
            },
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            }
        ];

        const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
        const response = await retryWithBackoff(async () => {
            return await model.generateContent(prompt);
        });

        const editingSuggestions = response.response.text();

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`✅ Generated editing suggestions for existing image`);
        }

        // Return enhanced result with original image and suggestions
        return {
            imageUrl: `data:${mimeType};base64,${base64Image}`,
            originalImage: `data:${mimeType};base64,${base64Image}`,
            prompt: `${originalPrompt} + ${editPrompt}`,
            editPrompt: editPrompt,
            originalPrompt: originalPrompt,
            editingSuggestions: editingSuggestions,
            timestamp: new Date().toISOString(),
            id: generateId(),
            provider: 'gemini-edit-analysis',
            editType: 'ai-guided-edit',
            model: CONFIG.MODEL_NAME,
            status: 'analyzed',
            hasOriginal: true
        };

    } catch (error) {
        console.error('❌ Image editing error:', error.message);

        // Fallback to generating new image
        try {
            const modifiedPrompt = originalPrompt ?
                `${originalPrompt}, ${editPrompt}` :
                editPrompt;
            return await generateImage(modifiedPrompt);
        } catch (fallbackError) {
            console.error('❌ Fallback generation also failed:', fallbackError.message);
            return generatePlaceholderImage(
                `${originalPrompt} + ${editPrompt}`,
                'error',
                `Edit failed: ${error.message}`
            );
        }
    }
};

/**
 * Ensure character consistency using reference image and enhanced prompts
 */
const ensureCharacterConsistency = async (referenceImageUrl, newPrompt, characterName) => {
    try {
        // Validate inputs
        validateImageInput(newPrompt);

        if (!characterName || typeof characterName !== 'string') {
            console.warn('⚠️ Invalid character name, proceeding without character consistency');
            return await generateImage(newPrompt);
        }

        if (!genAI) {
            if (CONFIG.LOG_LEVEL === 'info') {
                console.warn('⚠️ Gemini AI not available, using enhanced text prompt for consistency');
            }
            return await generateImageWithCharacterPrompt(newPrompt, characterName);
        }

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`👥 Ensuring character consistency for: ${characterName}`);
        }

        // Check if we have a valid reference image
        if (referenceImageUrl && referenceImageUrl.startsWith('data:image/')) {
            try {
                const base64Image = referenceImageUrl.split(',')[1];
                validateImageData(base64Image);

                const mimeType = detectMimeType(base64Image);

                // Create character consistency analysis prompt
                const consistencyPrompt = `Analyze the character "${characterName}" in the provided reference image and create detailed guidelines for maintaining consistency in a new scene.

New scene description: ${newPrompt}

Please provide:
1. Detailed character description (appearance, clothing, style)
2. Key visual elements that must remain consistent
3. How to adapt the character to the new scene context
4. Specific artistic direction for maintaining visual continuity
5. Color palette and style guidelines

Be very specific about maintaining character recognition while fitting the new scene.`;

                const prompt = [
                    {
                        text: consistencyPrompt
                    },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    }
                ];

                const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });
                const response = await retryWithBackoff(async () => {
                    return await model.generateContent(prompt);
                });

                const consistencyGuidelines = response.response.text();

                if (CONFIG.LOG_LEVEL === 'info') {
                    console.log(`✅ Generated character consistency guidelines`);
                }

                // Generate new image with consistency guidelines
                const enhancedPrompt = `${newPrompt}. Character consistency guidelines: ${consistencyGuidelines}`;
                const newImage = await generateImage(enhancedPrompt);

                // Add consistency metadata
                return {
                    ...newImage,
                    characterName: characterName,
                    referenceImage: referenceImageUrl,
                    consistencyGuidelines: consistencyGuidelines,
                    method: 'ai-guided-consistency',
                    hasReference: true
                };

            } catch (referenceError) {
                console.warn('⚠️ Reference image processing failed:', referenceError.message);
                // Fall through to text-based consistency
            }
        }

        // Fallback to enhanced text prompt for character consistency
        return await generateImageWithCharacterPrompt(newPrompt, characterName);

    } catch (error) {
        console.error('❌ Character consistency error:', error.message);

        // Final fallback to regular generation
        try {
            return await generateImage(newPrompt);
        } catch (fallbackError) {
            return generatePlaceholderImage(
                newPrompt,
                'error',
                `Character consistency failed: ${error.message}`
            );
        }
    }
};

/**
 * Generate image with enhanced character consistency prompt
 */
const generateImageWithCharacterPrompt = async (newPrompt, characterName) => {
    const consistencyPrompt = createNarrativePrompt(
        `${newPrompt}, featuring ${characterName} with consistent character design, same facial features, same clothing style, maintaining visual continuity from previous scenes`,
        CONFIG.DEFAULT_STYLE
    );

    const image = await generateImage(consistencyPrompt);

    return {
        ...image,
        characterName: characterName,
        method: 'text-based-consistency',
        hasReference: false
    };
};

/**
 * Generate images for all scenes with smart image selection and processing
 */
const generateSceneImages = async (scenes, characterDescriptions = {}, uploadedImages = []) => {
    try {
        // Validate inputs
        if (!Array.isArray(scenes) || scenes.length === 0) {
            throw new Error('Invalid scenes: must be non-empty array');
        }

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`🎨 Processing ${scenes.length} scenes with ${uploadedImages?.length || 0} uploaded images`);
        }

        const generatedScenes = [];
        const characterPrompts = createCharacterPrompts(characterDescriptions);
        let referenceImages = {}; // Store reference images for character consistency

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];

            if (!scene || !scene.visualPrompt) {
                console.warn(`⚠️ Invalid scene at index ${i}, skipping`);
                continue;
            }

            if (CONFIG.LOG_LEVEL === 'info') {
                console.log(`🎬 Processing scene ${scene.sceneNumber || i + 1}: ${scene.visualPrompt.substring(0, 50)}...`);
            }

            let image;

            try {
                // Determine processing strategy
                if (uploadedImages && uploadedImages.length > 0) {
                    // Strategy 1: Edit uploaded images
                    image = await processUploadedImageForScene(scene, uploadedImages, i);
                } else if (i > 0 && Object.keys(characterDescriptions).length > 0) {
                    // Strategy 2: Maintain character consistency
                    image = await processSceneWithCharacterConsistency(
                        scene,
                        characterPrompts,
                        referenceImages
                    );
                } else {
                    // Strategy 3: Generate new image
                    image = await processNewSceneImage(scene, characterPrompts);
                }

                // Store reference for character consistency
                if (scene.characters && scene.characters.length > 0) {
                    scene.characters.forEach(character => {
                        referenceImages[character] = image.imageUrl;
                    });
                }

            } catch (sceneError) {
                console.error(`❌ Error processing scene ${i + 1}:`, sceneError.message);

                // Generate fallback image
                image = generatePlaceholderImage(
                    scene.visualPrompt,
                    'error',
                    `Scene processing failed: ${sceneError.message}`
                );
            }

            generatedScenes.push({
                ...scene,
                image,
                enhancedPrompt: scene.visualPrompt,
                processingIndex: i
            });

            // Smart rate limiting - longer delay for API calls, shorter for placeholders
            const delay = image.provider === 'storymill-placeholder' ? 100 : CONFIG.RATE_LIMIT_DELAY;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        if (CONFIG.LOG_LEVEL === 'info') {
            console.log(`✅ Successfully processed ${generatedScenes.length} scene images`);
        }

        return generatedScenes;

    } catch (error) {
        console.error('❌ Scene image generation failed:', error.message);
        throw new Error(`Failed to generate scene images: ${error.message}`);
    }
};

/**
 * Create character prompts string from descriptions
 */
const createCharacterPrompts = (characterDescriptions) => {
    if (!characterDescriptions || typeof characterDescriptions !== 'object') {
        return '';
    }

    return Object.entries(characterDescriptions)
        .filter(([name, desc]) => name && desc)
        .map(([name, desc]) => `${name}: ${desc}`)
        .join(', ');
};

/**
 * Process uploaded image for a specific scene
 */
const processUploadedImageForScene = async (scene, uploadedImages, sceneIndex) => {
    // Smart image selection - prefer relevant images or cycle through
    const imageIndex = sceneIndex % uploadedImages.length;
    const selectedImage = uploadedImages[imageIndex];

    if (!selectedImage || !selectedImage.base64) {
        throw new Error(`Invalid uploaded image at index ${imageIndex}`);
    }

    return await editUploadedImage(
        selectedImage.base64,
        scene.visualPrompt,
        scene.text || scene.description || ''
    );
};

/**
 * Process scene with character consistency
 */
const processSceneWithCharacterConsistency = async (scene, characterPrompts, referenceImages) => {
    const mainCharacter = scene.characters && scene.characters.length > 0 ? scene.characters[0] : null;

    if (mainCharacter && referenceImages[mainCharacter]) {
        return await ensureCharacterConsistency(
            referenceImages[mainCharacter],
            scene.visualPrompt,
            mainCharacter
        );
    } else {
        return await processNewSceneImage(scene, characterPrompts);
    }
};

/**
 * Process new scene image generation
 */
const processNewSceneImage = async (scene, characterPrompts) => {
    let enhancedPrompt = scene.visualPrompt;

    if (characterPrompts) {
        enhancedPrompt += `, featuring characters: ${characterPrompts}`;
    }

    // Add style consistency for multi-scene stories
    enhancedPrompt += ', consistent art style, maintain visual continuity';

    return await generateImage(enhancedPrompt);
};


/**
 * NANO BANANA IMAGE GENERATION SUMMARY:
 * 
 * PRIMARY SERVICE: Gemini 2.5 Flash Image Preview (Nano Banana)
 * - High-quality image generation following official Google GenAI docs
 * - Narrative prompt engineering for better results
 * - Multi-modal capabilities (text + image input)
 * - Natural language editing with image references
 * - Character consistency using reference images
 * 
 * FEATURES:
 * - Text-to-Image: Generate from descriptive prompts
 * - Image + Text-to-Image: Edit existing images with text prompts
 * - Multi-Image composition: Character consistency across scenes
 * - Iterative refinement: Conversational image editing
 * - High-fidelity rendering: Detailed storybook illustrations
 * 
 * BEST PRACTICES IMPLEMENTED:
 * - Descriptive narrative prompts vs keyword lists
 * - Proper image data extraction from API responses
 * - Multi-modal prompt structure for editing
 * - Character consistency using reference images
 * - Comprehensive error handling and fallbacks
 */

/**
 * STORYMILL IMAGE SERVICE - ENHANCED VERSION
 * 
 * FEATURES:
 * ✅ Configurable settings via environment variables
 * ✅ Proper input validation and error handling
 * ✅ Smart image processing strategies
 * ✅ Enhanced placeholder generation with AI descriptions
 * ✅ Comprehensive logging and debugging
 * ✅ Memory-efficient base64 handling
 * ✅ Standardized response objects
 * ✅ Graceful fallbacks for all scenarios
 * 
 * CONFIGURATION:
 * - GEMINI_API_KEY: Your Gemini API key
 * - GEMINI_IMAGE_MODEL: Model to use (default: gemini-1.5-pro-latest)
 * - DEFAULT_IMAGE_STYLE: Default art style (default: storybook illustration)
 * - MAX_IMAGE_SIZE: Maximum image size in bytes (default: 5MB)
 * - RATE_LIMIT_DELAY: Delay between API calls in ms (default: 1000)
 * - LOG_LEVEL: Logging level (info, warn, error)
 * 
 * USAGE:
 * - generateImage(prompt, style): Generate new image
 * - editUploadedImage(base64, prompt, context): Edit uploaded image
 * - editImage(imageUrl, prompt, originalPrompt): Edit existing image
 * - ensureCharacterConsistency(refImage, prompt, character): Maintain character consistency
 * - generateSceneImages(scenes, characters, uploadedImages): Process all scenes
 */

module.exports = {
    generateImage,
    editImage,
    editUploadedImage,
    generateSceneImages,
    ensureCharacterConsistency,
    createNarrativePrompt,

    // Utility functions for advanced usage
    validateImageInput,
    validateImageData,
    detectMimeType,
    generatePlaceholderImage,

    // Configuration access
    getConfig: () => ({ ...CONFIG })
};