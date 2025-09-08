const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sanitizeText, retryWithBackoff, generateId } = require('../utils/apiHelpers');

// Configuration
const CONFIG = {
  PRO_MODEL: 'gemini-2.5-pro',
  IMAGE_MODEL: 'gemini-2.5-flash-image-preview',
  MIN_SCENES: 3,
  MAX_SCENES: 6,
  SCENE_DURATION: 4,
  MAX_PROMPT_LENGTH: 1800
};

// Initialize Gemini AI models
const initializeGemini = () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Gemini AI initialized successfully');
    return {
      proModel: genAI.getGenerativeModel({ model: CONFIG.PRO_MODEL }),
      imageModel: genAI.getGenerativeModel({ model: CONFIG.IMAGE_MODEL })
    };
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error.message);
    return { proModel: null, imageModel: null };
  }
};

const { proModel, imageModel } = initializeGemini();

// Enhanced prompt for story analysis with image context awareness
const createStoryAnalysisPrompt = (storyText, imageContexts = []) => {
  let prompt = `You are a professional storyboard artist analyzing a story for visual narrative creation.`;
  
  if (imageContexts.length > 0) {
    prompt += `\n\nIMAGE CONTEXT AVAILABLE: You have ${imageContexts.length} uploaded image(s) that should be integrated into the story scenes. These images contain characters/objects that must be contextually placed within the story narrative.`;
    
    imageContexts.forEach((context, index) => {
      prompt += `\n- Image ${index + 1}: ${context.description}`;
    });
    
    prompt += `\n\nIMPORTANT: When creating visual prompts, indicate which uploaded images should be integrated and how they fit the story context.`;
  }
  
  prompt += `\n\nAnalyze this story and break it into EXACTLY ${CONFIG.MIN_SCENES}-${CONFIG.MAX_SCENES} visual scenes:

RULES:
- MINIMUM ${CONFIG.MIN_SCENES} scenes, MAXIMUM ${CONFIG.MAX_SCENES} scenes
- Each scene represents a key story moment with rich visual context
- Include mood, atmosphere, environmental details, and character positioning
- If uploaded images exist, specify how they integrate into each relevant scene
- Each scene duration: ${CONFIG.SCENE_DURATION} seconds

Story: "${storyText}"

Return ONLY a JSON array with this exact structure:

[
  {
    "sceneNumber": 1,
    "description": "Brief description of what happens",
    "visualPrompt": "Detailed storybook illustration with composition guidance: [characters, setting, action, mood, lighting, camera angle, ensure all subjects fully visible in frame]",
    "characters": ["character1", "character2"],
    "setting": "location name",
    "mood": "peaceful/exciting/scary/magical/sad/happy",
    "timeOfDay": "morning/afternoon/evening/night",
    "weather": "sunny/rainy/stormy/snowy/clear",
    "environment": "indoor/outdoor/nature/urban/fantasy",
    "soundContext": "peaceful/action/horror/magical/urban/nature",
    "uploadedImageIntegration": {
      "useUploadedImage": true/false,
      "imageIndex": 0,
      "contextualPlacement": "how the uploaded image character/object fits this scene",
      "editingInstructions": "specific modifications needed for story context"
    },
    "duration": ${CONFIG.SCENE_DURATION}
  }
]

COMPOSITION REQUIREMENTS:
- Wide-angle view ensuring all characters are fully visible
- Proper spacing around subjects to prevent cropping
- Balanced scene layout with clear focal points
- Cinematic framing appropriate for storybook illustration

Return ONLY the JSON array, no explanations or markdown.`;

  return prompt;
};

// Enhanced image context analysis using Gemini 2.5 Pro
const analyzeUploadedImages = async (uploadedImages) => {
  if (!proModel || !uploadedImages?.length) {
    return [];
  }

  const imageContexts = [];

  for (let i = 0; i < uploadedImages.length; i++) {
    const image = uploadedImages[i];
    
    try {
      const analysisPrompt = `Analyze this uploaded image for story integration context.

ANALYSIS REQUIRED:
1. MAIN SUBJECTS: Identify people, objects, or characters in the image
2. SETTING: Describe the environment/background
3. MOOD/ATMOSPHERE: What emotional tone does the image convey?
4. STORY POTENTIAL: How could this image be integrated into different story contexts?
5. EDITING NEEDS: What modifications might be needed to fit various story scenarios?

IMPORTANT: Focus on identifying elements that can be contextually placed into story narratives.

Return a JSON object with this structure:
{
  "subjects": ["person/object descriptions"],
  "setting": "environment description",
  "mood": "emotional atmosphere",
  "storyIntegrationOptions": "how this could fit different story types",
  "editingCapabilities": "what can be modified for story context",
  "description": "overall image description for story planning"
}

Return ONLY the JSON object.`;

      const imageData = {
        inlineData: {
          data: image.base64?.replace(/^data:image\/[^;]+;base64,/, '') || image.data,
          mimeType: image.mimeType || 'image/jpeg'
        }
      };

      const response = await retryWithBackoff(() =>
        proModel.generateContent([analysisPrompt, imageData])
      );

      const analysisText = response.response.text().trim();
      const cleanedText = analysisText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const context = JSON.parse(jsonMatch[0]);
        imageContexts.push({
          ...context,
          imageIndex: i,
          originalImage: image
        });
      } else {
        // Fallback context
        imageContexts.push({
          subjects: ['person or object'],
          setting: 'scene setting',
          mood: 'neutral',
          description: 'uploaded image for story integration',
          imageIndex: i,
          originalImage: image
        });
      }

      console.log(`Analyzed uploaded image ${i + 1} for story context`);

    } catch (error) {
      console.error(`Error analyzing uploaded image ${i + 1}:`, error.message);
      
      // Add fallback context
      imageContexts.push({
        subjects: ['uploaded subject'],
        setting: 'story setting',
        mood: 'neutral',
        description: 'uploaded image for integration',
        imageIndex: i,
        originalImage: image
      });
    }
  }

  return imageContexts;
};

// Enhanced story analysis with image integration
const analyzeStory = async (storyText, uploadedImages = []) => {
  const cleanText = sanitizeText(storyText);
  
  if (!proModel) {
    console.warn('Gemini Pro not available, using fallback analysis');
    return generateFallbackScenes(cleanText, uploadedImages);
  }

  try {
    console.log('Analyzing story with Gemini 2.5 Pro...');
    
    // First, analyze uploaded images for context if they exist
    const imageContexts = await analyzeUploadedImages(uploadedImages);
    
    if (imageContexts.length > 0) {
      console.log(`Integrated ${imageContexts.length} uploaded images into story analysis`);
    }

    // Create enhanced story analysis prompt
    const analysisPrompt = createStoryAnalysisPrompt(cleanText, imageContexts);
    
    const response = await retryWithBackoff(() =>
      proModel.generateContent(analysisPrompt)
    );

    const responseText = response.response.text().trim();
    console.log('Gemini Pro response received, parsing scenes...');

    // Parse and validate the response
    const scenes = parseAndValidateScenes(responseText, cleanText, imageContexts);
    
    console.log(`Successfully analyzed story into ${scenes.length} scenes with image integration`);
    return scenes;

  } catch (error) {
    console.error('Error in story analysis:', error.message);
    return generateFallbackScenes(cleanText, uploadedImages);
  }
};

// Parse and validate Gemini response with enhanced error handling
const parseAndValidateScenes = (responseText, storyText, imageContexts = []) => {
  try {
    // Clean the response
    let cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in response, using fallback');
      return generateFallbackScenes(storyText, imageContexts.map(ctx => ctx.originalImage));
    }

    const rawScenes = JSON.parse(jsonMatch[0]);
    
    // Validate and enhance scenes
    const validatedScenes = rawScenes.map((scene, index) => {
      const baseScene = {
        sceneNumber: index + 1,
        description: scene.description || `Scene ${index + 1} from the story`,
        visualPrompt: enhanceVisualPrompt(scene.visualPrompt || `Scene ${index + 1} illustration`, scene),
        characters: Array.isArray(scene.characters) ? scene.characters : [],
        setting: scene.setting || 'story setting',
        mood: scene.mood || 'peaceful',
        timeOfDay: scene.timeOfDay || 'afternoon',
        weather: scene.weather || 'clear',
        environment: scene.environment || 'outdoor',
        soundContext: scene.soundContext || 'nature',
        duration: typeof scene.duration === 'number' ? scene.duration : CONFIG.SCENE_DURATION
      };

      // Add image integration info if present
      if (scene.uploadedImageIntegration) {
        baseScene.uploadedImageIntegration = {
          useUploadedImage: Boolean(scene.uploadedImageIntegration.useUploadedImage),
          imageIndex: scene.uploadedImageIntegration.imageIndex || 0,
          contextualPlacement: scene.uploadedImageIntegration.contextualPlacement || 'integrate uploaded subject into scene',
          editingInstructions: scene.uploadedImageIntegration.editingInstructions || 'place subject appropriately in story context'
        };
      }

      return baseScene;
    });

    // Ensure scene count is within bounds
    const boundedScenes = validatedScenes.slice(0, CONFIG.MAX_SCENES);
    if (boundedScenes.length < CONFIG.MIN_SCENES) {
      return padScenesWithFallback(boundedScenes, storyText, CONFIG.MIN_SCENES);
    }

    return boundedScenes;

  } catch (parseError) {
    console.error('Error parsing scenes response:', parseError.message);
    return generateFallbackScenes(storyText, imageContexts.map(ctx => ctx.originalImage));
  }
};

// Enhanced visual prompt with composition improvements
const enhanceVisualPrompt = (originalPrompt, sceneData) => {
  let enhanced = originalPrompt;
  
  // Add composition guidance if not present
  if (!enhanced.toLowerCase().includes('wide') && !enhanced.toLowerCase().includes('full')) {
    enhanced += ', wide-angle composition ensuring all subjects are fully visible within frame boundaries';
  }
  
  // Add storybook style if not present
  if (!enhanced.toLowerCase().includes('storybook')) {
    enhanced += ', professional storybook illustration style';
  }
  
  // Add quality descriptors
  enhanced += ', balanced layout, proper spacing around characters, cinematic lighting, rich colors';
  
  return enhanced.length > CONFIG.MAX_PROMPT_LENGTH ? 
    enhanced.substring(0, CONFIG.MAX_PROMPT_LENGTH) + '...' : enhanced;
};

// Generate contextual editing prompt for uploaded images
const generateImageEditPrompt = async (originalImageContext, sceneContext, userEditRequest = '') => {
  if (!proModel) {
    return createFallbackEditPrompt(originalImageContext, sceneContext, userEditRequest);
  }

  const editPromptTemplate = `You are an expert at creating precise image editing instructions for Gemini 2.5 Flash Image Preview.

CONTEXT:
- Original Image: ${originalImageContext.description}
- Target Story Scene: ${sceneContext.description}
- Scene Mood: ${sceneContext.mood}
- Scene Setting: ${sceneContext.setting}
- Time of Day: ${sceneContext.timeOfDay}
- Additional User Request: ${userEditRequest || 'None'}

TASK: Create a precise editing instruction that:
1. Maintains the main subject's identity from the uploaded image
2. Adapts the subject to fit the story scene context perfectly
3. Modifies background, lighting, and atmosphere to match scene requirements
4. Ensures the subject appears naturally integrated into the story scene
5. Incorporates any specific user editing requests

EDITING INSTRUCTION STRUCTURE:
"PROFESSIONAL IMAGE EDITING: [specific modifications needed]. 
SCENE CONTEXT: Place the subject in [scene setting] during [time of day] with [mood] atmosphere.
PRESERVATION: Maintain subject's core identity and recognizable features.
INTEGRATION: [specific background/lighting/atmosphere changes for story context]."

Return ONLY the editing instruction, no explanations.`;

  try {
    const response = await retryWithBackoff(() =>
      proModel.generateContent(editPromptTemplate)
    );

    const editInstruction = response.response.text().trim();
    
    // Ensure it's under length limit
    return editInstruction.length > CONFIG.MAX_PROMPT_LENGTH ?
      editInstruction.substring(0, CONFIG.MAX_PROMPT_LENGTH) + '...' :
      editInstruction;

  } catch (error) {
    console.error('Error generating edit prompt:', error.message);
    return createFallbackEditPrompt(originalImageContext, sceneContext, userEditRequest);
  }
};

// Fallback edit prompt creation
const createFallbackEditPrompt = (imageContext, sceneContext, userEdit) => {
  return `PROFESSIONAL IMAGE EDITING: Adapt the uploaded subject to fit ${sceneContext.setting} during ${sceneContext.timeOfDay} with ${sceneContext.mood} mood. ${userEdit ? `Additional changes: ${userEdit}.` : ''} Maintain subject identity while integrating into story context.`;
};

// Enhanced fallback scene generation
const generateFallbackScenes = (storyText, uploadedImages = []) => {
  console.log('Generating enhanced fallback scenes...');
  
  const sentences = storyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const targetScenes = Math.min(Math.max(Math.ceil(sentences.length / 3), CONFIG.MIN_SCENES), CONFIG.MAX_SCENES);
  const sentencesPerScene = Math.ceil(sentences.length / targetScenes);
  
  const scenes = [];
  
  for (let i = 0; i < targetScenes; i++) {
    const startIdx = i * sentencesPerScene;
    const endIdx = Math.min(startIdx + sentencesPerScene, sentences.length);
    const sceneText = sentences.slice(startIdx, endIdx).join('. ').trim();
    
    if (sceneText) {
      const scene = {
        sceneNumber: i + 1,
        description: sceneText,
        visualPrompt: `Professional storybook illustration: ${sceneText}, wide-angle view ensuring all characters fully visible, balanced composition, cinematic lighting, rich colors`,
        characters: extractSimpleCharacters(sceneText),
        setting: extractSimpleSetting(sceneText),
        mood: extractSimpleMood(sceneText),
        timeOfDay: extractSimpleTimeOfDay(sceneText),
        weather: 'clear',
        environment: extractSimpleEnvironment(sceneText),
        soundContext: extractSimpleSoundContext(sceneText),
        duration: CONFIG.SCENE_DURATION
      };

      // Add image integration for fallback if images available
      if (uploadedImages?.length > 0 && i < uploadedImages.length) {
        scene.uploadedImageIntegration = {
          useUploadedImage: true,
          imageIndex: i,
          contextualPlacement: 'integrate uploaded subject into this scene context',
          editingInstructions: `Place uploaded subject in ${scene.setting} with ${scene.mood} atmosphere during ${scene.timeOfDay}`
        };
      }

      scenes.push(scene);
    }
  }
  
  return padScenesWithFallback(scenes, storyText, CONFIG.MIN_SCENES);
};

// Pad scenes to minimum required
const padScenesWithFallback = (scenes, storyText, minScenes) => {
  while (scenes.length < minScenes) {
    const partLength = Math.ceil(storyText.length / minScenes);
    const startIdx = scenes.length * partLength;
    const sceneText = storyText.substring(startIdx, startIdx + partLength).trim() || 
                     `Part ${scenes.length + 1} of the story`;
    
    scenes.push({
      sceneNumber: scenes.length + 1,
      description: sceneText,
      visualPrompt: `Professional storybook illustration showing: ${sceneText}, wide-angle composition, all subjects fully visible, balanced layout`,
      characters: [],
      setting: 'story setting',
      mood: 'peaceful',
      timeOfDay: 'afternoon',
      weather: 'clear',
      environment: 'nature',
      soundContext: 'nature',
      duration: CONFIG.SCENE_DURATION
    });
  }
  
  return scenes.slice(0, CONFIG.MAX_SCENES);
};

// Simple extraction functions for fallback scenarios
const extractSimpleCharacters = (text) => {
  const characters = [];
  const patterns = ['girl', 'boy', 'man', 'woman', 'child', 'king', 'queen', 'prince', 'princess', 'hero', 'heroine'];
  
  patterns.forEach(pattern => {
    if (text.toLowerCase().includes(pattern)) {
      characters.push(pattern);
    }
  });
  
  return [...new Set(characters)]; // Remove duplicates
};

const extractSimpleSetting = (text) => {
  const settings = ['village', 'forest', 'castle', 'mountain', 'ocean', 'house', 'garden', 'market', 'field'];
  return settings.find(setting => text.toLowerCase().includes(setting)) || 'outdoor scene';
};

const extractSimpleMood = (text) => {
  const lowerText = text.toLowerCase();
  const moodMap = {
    scary: ['scary', 'dark', 'fear', 'frightening'],
    exciting: ['exciting', 'adventure', 'running', 'chase'],
    magical: ['magic', 'fairy', 'enchanted', 'spell'],
    sad: ['sad', 'cry', 'tears', 'sorrow'],
    happy: ['happy', 'joy', 'laugh', 'smile']
  };
  
  for (const [mood, keywords] of Object.entries(moodMap)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return mood;
    }
  }
  
  return 'peaceful';
};

const extractSimpleTimeOfDay = (text) => {
  const lowerText = text.toLowerCase();
  const timeMap = {
    night: ['night', 'dark', 'moon'],
    morning: ['morning', 'dawn', 'sunrise'],
    evening: ['evening', 'sunset', 'dusk']
  };
  
  for (const [time, keywords] of Object.entries(timeMap)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return time;
    }
  }
  
  return 'afternoon';
};

const extractSimpleEnvironment = (text) => {
  const lowerText = text.toLowerCase();
  const envMap = {
    indoor: ['house', 'room', 'indoor'],
    urban: ['city', 'street', 'urban'],
    fantasy: ['magic', 'fairy', 'enchanted']
  };
  
  for (const [env, keywords] of Object.entries(envMap)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return env;
    }
  }
  
  return 'nature';
};

const extractSimpleSoundContext = (text) => {
  const lowerText = text.toLowerCase();
  const soundMap = {
    horror: ['scary', 'dark', 'ghost'],
    action: ['running', 'chase', 'fight'],
    magical: ['magic', 'fairy', 'spell'],
    urban: ['city', 'street', 'market']
  };
  
  for (const [sound, keywords] of Object.entries(soundMap)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return sound;
    }
  }
  
  return 'nature';
};

// Enhanced character extraction with Gemini Pro
const extractCharacters = async (storyText) => {
  if (!proModel) {
    return extractSimpleCharactersFromText(storyText);
  }

  const cleanText = sanitizeText(storyText);
  
  const characterExtractionPrompt = `Extract main characters from this story with detailed visual descriptions for consistent illustration.

Story: "${cleanText}"

REQUIREMENTS:
- Identify 2-5 main characters maximum
- Provide visual descriptions including: age, gender, distinctive features, typical clothing
- Focus on characters that appear multiple times or are central to the story
- Descriptions should enable consistent character representation across scenes

Return ONLY a JSON object:
{
  "character_name": "detailed visual description including age, appearance, clothing style",
  "another_character": "detailed visual description"
}

If no clear recurring characters, return empty object: {}`;

  try {
    const response = await retryWithBackoff(() =>
      proModel.generateContent(characterExtractionPrompt)
    );

    const responseText = response.response.text().trim();
    const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const characters = JSON.parse(jsonMatch[0]);
      console.log(`Extracted ${Object.keys(characters).length} characters from story`);
      return characters;
    }
    
    return extractSimpleCharactersFromText(cleanText);

  } catch (error) {
    console.error('Error extracting characters:', error.message);
    return extractSimpleCharactersFromText(cleanText);
  }
};

// Simple character extraction fallback
const extractSimpleCharactersFromText = (text) => {
  const characters = {};
  const lowerText = text.toLowerCase();
  
  const patterns = [
    { regex: /\b(girl|young girl|little girl)\b/g, desc: 'a young girl with kind eyes and simple clothing' },
    { regex: /\b(boy|young boy|little boy)\b/g, desc: 'a young boy with curious expression and casual attire' },
    { regex: /\b(woman|lady|mother)\b/g, desc: 'a wise woman with gentle features and traditional dress' },
    { regex: /\b(man|father|gentleman)\b/g, desc: 'a kind man with strong features and simple clothing' },
    { regex: /\b(king|ruler)\b/g, desc: 'a noble king with royal attire and crown' },
    { regex: /\b(queen)\b/g, desc: 'an elegant queen with royal dress and jewelry' }
  ];
  
  patterns.forEach(({ regex, desc }) => {
    const matches = lowerText.match(regex);
    if (matches?.length > 0) {
      const characterName = matches[0].replace(/\b(a|an|the)\s+/g, '');
      characters[characterName] = desc;
    }
  });
  
  return characters;
};

module.exports = {
  analyzeStory,
  analyzeUploadedImages,
  generateImageEditPrompt,
  extractCharacters,
  createStoryAnalysisPrompt,
  enhanceVisualPrompt
};