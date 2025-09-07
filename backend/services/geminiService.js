const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sanitizeText, retryWithBackoff } = require('../utils/apiHelpers');

// Initialize Gemini AI
let genAI, model;

try {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }); // Use available model
    
    console.log('Gemini AI initialized successfully');
} catch (error) {
    console.error('Failed to initialize Gemini AI:', error.message);
    model = null;
}

/**
 * Analyze story and break it into scenes
 */
const analyzeStory = async (storyText) => {
    if (!model) {
        return generateFallbackScenes(storyText);
    }
    
    const cleanText = sanitizeText(storyText);
    
    const prompt = `You are a professional storyboard artist. Analyze this story and break it into EXACTLY 3-6 visual scenes with rich context.

RULES:
- MINIMUM 3 scenes, MAXIMUM 6 scenes
- Each scene should represent a key story moment
- Scenes should flow logically from beginning to end
- Include mood, atmosphere, and environmental context
- Each scene duration should be 4-5 seconds

Story: "${cleanText}"

Return ONLY a JSON array with this exact structure:

[
  {
    "sceneNumber": 1,
    "description": "Brief description of what happens in this scene",
    "visualPrompt": "Detailed storybook illustration: [characters, setting, action, mood, lighting, atmosphere]",
    "characters": ["character1", "character2"],
    "setting": "location name",
    "mood": "peaceful/exciting/scary/magical/sad/happy",
    "timeOfDay": "morning/afternoon/evening/night",
    "weather": "sunny/rainy/stormy/snowy/clear",
    "environment": "indoor/outdoor/nature/urban/fantasy",
    "soundContext": "peaceful/action/horror/magical/urban/nature",
    "duration": 4
  }
]

ANALYZE the story context carefully:
- Detect mood and atmosphere (peaceful, scary, exciting, magical, sad)
- Identify time of day and weather conditions
- Determine environment type for proper ambient sounds
- Note any action or emotional moments

IMPORTANT: Return ONLY the JSON array, no explanations, no markdown, no other text.`;

    return retryWithBackoff(async () => {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            
            console.log('Gemini response received, parsing scenes...');
            
            // Clean the response text
            let cleanedText = text.trim();
            
            // Remove markdown code blocks if present
            cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // Extract JSON from response
            const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn('No JSON array found in Gemini response, using fallback');
                return generateFallbackScenes(cleanText);
            }
            
            const scenes = JSON.parse(jsonMatch[0]);
            
            // Validate and enhance scenes with full context
            const validatedScenes = scenes.map((scene, index) => ({
                sceneNumber: index + 1,
                description: scene.description || `Scene ${index + 1} from the story`,
                visualPrompt: scene.visualPrompt || `A storybook illustration showing scene ${index + 1}`,
                characters: Array.isArray(scene.characters) ? scene.characters : [],
                setting: scene.setting || 'story setting',
                mood: scene.mood || 'peaceful',
                timeOfDay: scene.timeOfDay || 'day',
                weather: scene.weather || 'clear',
                environment: scene.environment || 'outdoor',
                soundContext: scene.soundContext || 'nature',
                duration: typeof scene.duration === 'number' ? scene.duration : 4
            }));
            
            console.log(`Successfully analyzed story into ${validatedScenes.length} scenes`);
            return validatedScenes;
            
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError.message);
            return generateFallbackScenes(cleanText);
        }
    });
};

/**
 * Generate fallback scenes when Gemini fails - ALWAYS 3-6 scenes
 */
const generateFallbackScenes = (storyText) => {
    console.log('Generating fallback scenes...');
    
    // Split story into sentences
    const sentences = storyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Force 3-6 scenes based on story length
    let targetScenes;
    if (sentences.length <= 6) targetScenes = 3;
    else if (sentences.length <= 12) targetScenes = 4;
    else if (sentences.length <= 18) targetScenes = 5;
    else targetScenes = 6;
    
    const sentencesPerScene = Math.ceil(sentences.length / targetScenes);
    const scenes = [];
    
    for (let i = 0; i < targetScenes; i++) {
        const startIdx = i * sentencesPerScene;
        const endIdx = Math.min(startIdx + sentencesPerScene, sentences.length);
        const sceneText = sentences.slice(startIdx, endIdx).join('. ').trim();
        
        if (sceneText) {
            scenes.push({
                sceneNumber: i + 1,
                description: sceneText,
                visualPrompt: `A storybook illustration showing: ${sceneText}, colorful, detailed, child-friendly art style`,
                characters: extractSimpleCharacters(sceneText),
                setting: extractSimpleSetting(sceneText),
                mood: extractSimpleMood(sceneText),
                timeOfDay: extractSimpleTimeOfDay(sceneText),
                weather: 'clear',
                environment: extractSimpleEnvironment(sceneText),
                soundContext: extractSimpleSoundContext(sceneText),
                duration: 4
            });
        }
    }
    
    // Ensure we have at least 3 scenes
    while (scenes.length < 3) {
        const partLength = Math.ceil(storyText.length / 3);
        const startIdx = scenes.length * partLength;
        const sceneText = storyText.substring(startIdx, startIdx + partLength).trim();
        
        scenes.push({
            sceneNumber: scenes.length + 1,
            description: sceneText || `Part ${scenes.length + 1} of the story`,
            visualPrompt: `A storybook illustration showing part ${scenes.length + 1} of the story, colorful, detailed, child-friendly art style`,
            characters: [],
            setting: 'story setting',
            mood: 'peaceful',
            timeOfDay: 'afternoon',
            weather: 'clear',
            environment: 'nature',
            soundContext: 'nature',
            duration: 4
        });
    }
    
    return scenes.slice(0, 6); // Ensure max 6 scenes
};

/**
 * Simple character extraction for fallback
 */
const extractSimpleCharacters = (text) => {
    const characters = [];
    const commonNames = ['girl', 'boy', 'man', 'woman', 'child', 'king', 'queen', 'prince', 'princess', 'hero', 'heroine'];
    
    commonNames.forEach(name => {
        if (text.toLowerCase().includes(name)) {
            characters.push(name);
        }
    });
    
    return characters;
};

/**
 * Simple setting extraction for fallback
 */
const extractSimpleSetting = (text) => {
    const settings = ['village', 'forest', 'castle', 'mountain', 'ocean', 'house', 'garden', 'market', 'field'];
    
    for (const setting of settings) {
        if (text.toLowerCase().includes(setting)) {
            return setting;
        }
    }
    
    return 'outdoor scene';
};

/**
 * Simple mood extraction for fallback
 */
const extractSimpleMood = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('scary') || lowerText.includes('dark') || lowerText.includes('fear')) {
        return 'scary';
    } else if (lowerText.includes('exciting') || lowerText.includes('adventure') || lowerText.includes('running')) {
        return 'exciting';
    } else if (lowerText.includes('magic') || lowerText.includes('fairy') || lowerText.includes('enchanted')) {
        return 'magical';
    } else if (lowerText.includes('sad') || lowerText.includes('cry') || lowerText.includes('tears')) {
        return 'sad';
    } else if (lowerText.includes('happy') || lowerText.includes('joy') || lowerText.includes('laugh')) {
        return 'happy';
    }
    
    return 'peaceful';
};

/**
 * Simple time of day extraction for fallback
 */
const extractSimpleTimeOfDay = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('night') || lowerText.includes('dark') || lowerText.includes('moon')) {
        return 'night';
    } else if (lowerText.includes('morning') || lowerText.includes('dawn') || lowerText.includes('sunrise')) {
        return 'morning';
    } else if (lowerText.includes('evening') || lowerText.includes('sunset') || lowerText.includes('dusk')) {
        return 'evening';
    }
    
    return 'afternoon';
};

/**
 * Simple environment extraction for fallback
 */
const extractSimpleEnvironment = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('house') || lowerText.includes('room') || lowerText.includes('indoor')) {
        return 'indoor';
    } else if (lowerText.includes('city') || lowerText.includes('street') || lowerText.includes('urban')) {
        return 'urban';
    } else if (lowerText.includes('magic') || lowerText.includes('fairy') || lowerText.includes('enchanted')) {
        return 'fantasy';
    }
    
    return 'nature';
};

/**
 * Simple sound context extraction for fallback
 */
const extractSimpleSoundContext = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('scary') || lowerText.includes('dark') || lowerText.includes('ghost')) {
        return 'horror';
    } else if (lowerText.includes('running') || lowerText.includes('chase') || lowerText.includes('fight')) {
        return 'action';
    } else if (lowerText.includes('magic') || lowerText.includes('fairy') || lowerText.includes('spell')) {
        return 'magical';
    } else if (lowerText.includes('city') || lowerText.includes('street') || lowerText.includes('market')) {
        return 'urban';
    }
    
    return 'nature';
};

/**
 * Generate enhanced prompt for image editing
 */
const generateEditPrompt = async (originalPrompt, userEdit) => {
    if (!model) {
        return `${originalPrompt}, ${sanitizeText(userEdit)}`;
    }
    
    const cleanEdit = sanitizeText(userEdit);
    
    const prompt = `You are an expert at modifying image generation prompts.

Original image prompt: "${originalPrompt}"
User wants to change: "${cleanEdit}"

Create a new detailed image prompt that:
1. Incorporates the user's requested changes
2. Maintains the original scene's core elements and characters
3. Keeps the storybook illustration style
4. Ensures visual consistency

Return ONLY the new prompt, no explanations or additional text.`;

    return retryWithBackoff(async () => {
        try {
            const result = await model.generateContent(prompt);
            const newPrompt = result.response.text().trim();
            
            // Ensure it includes storybook style
            if (!newPrompt.toLowerCase().includes('storybook')) {
                return `${newPrompt}, storybook illustration style`;
            }
            
            return newPrompt;
        } catch (error) {
            console.error('Error generating edit prompt:', error.message);
            return `${originalPrompt}, ${cleanEdit}`;
        }
    });
};

/**
 * Extract character descriptions from story
 */
const extractCharacters = async (storyText) => {
    if (!model) {
        return extractSimpleCharactersFromText(storyText);
    }
    
    const cleanText = sanitizeText(storyText);
    
    const prompt = `Extract the main characters from this story and provide brief visual descriptions for consistent illustration.

Story: "${cleanText}"

Return ONLY a JSON object with character names as keys and visual descriptions as values:

{
  "character_name": "brief visual description including appearance, clothing, age",
  "another_character": "visual description"
}

If no clear characters, return empty object: {}`;

    return retryWithBackoff(async () => {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            
            // Clean the response
            let cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return extractSimpleCharactersFromText(cleanText);
        } catch (error) {
            console.error('Error extracting characters:', error.message);
            return extractSimpleCharactersFromText(cleanText);
        }
    });
};

/**
 * Simple character extraction fallback
 */
const extractSimpleCharactersFromText = (text) => {
    const characters = {};
    const lowerText = text.toLowerCase();
    
    // Common character patterns
    const patterns = [
        { regex: /\b(girl|young girl|little girl)\b/g, desc: 'a young girl with kind eyes' },
        { regex: /\b(boy|young boy|little boy)\b/g, desc: 'a young boy with curious expression' },
        { regex: /\b(woman|lady|mother)\b/g, desc: 'a wise woman with gentle features' },
        { regex: /\b(man|father|gentleman)\b/g, desc: 'a kind man with strong features' },
        { regex: /\b(king|ruler)\b/g, desc: 'a noble king with royal attire' },
        { regex: /\b(queen)\b/g, desc: 'an elegant queen with royal dress' },
        { regex: /\b(monkey|ape)\b/g, desc: 'a playful monkey with expressive eyes' },
        { regex: /\b(shepherd|farmer)\b/g, desc: 'a hardworking person in simple clothes' }
    ];
    
    patterns.forEach(pattern => {
        const matches = lowerText.match(pattern.regex);
        if (matches && matches.length > 0) {
            // Use the first match and clean it up
            const characterName = matches[0].replace(/\b(a|an|the)\s+/g, '');
            characters[characterName] = pattern.desc;
        }
    });
    
    return characters;
};

module.exports = {
  analyzeStory,
  generateEditPrompt,
  extractCharacters
};