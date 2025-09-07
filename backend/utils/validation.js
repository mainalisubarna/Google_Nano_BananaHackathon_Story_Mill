/**
 * Comprehensive backend validation utilities
 */

/**
 * Validate story input
 */
const validateStoryInput = (input) => {
    const errors = [];
    
    if (!input) {
        errors.push('Input is required');
        return { valid: false, errors };
    }
    
    // Check for text input
    if (input.storyText) {
        if (typeof input.storyText !== 'string') {
            errors.push('Story text must be a string');
        } else if (input.storyText.trim().length < 10) {
            errors.push('Story text must be at least 10 characters long');
        } else if (input.storyText.length > 5000) {
            errors.push('Story text must be less than 5000 characters');
        }
    }
    
    // Check for audio input
    else if (input.audioData) {
        if (typeof input.audioData !== 'string') {
            errors.push('Audio data must be base64 string');
        } else {
            try {
                const buffer = Buffer.from(input.audioData, 'base64');
                if (buffer.length === 0) {
                    errors.push('Audio data is empty');
                } else if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
                    errors.push('Audio file too large (max 10MB)');
                }
            } catch (error) {
                errors.push('Invalid base64 audio data');
            }
        }
    }
    
    // Must have either text or audio
    else {
        errors.push('Either storyText or audioData is required');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validate scene data structure
 */
const validateScenes = (scenes) => {
    const errors = [];
    
    if (!Array.isArray(scenes)) {
        errors.push('Scenes must be an array');
        return { valid: false, errors };
    }
    
    if (scenes.length < 3 || scenes.length > 6) {
        errors.push('Must have between 3-6 scenes');
    }
    
    scenes.forEach((scene, index) => {
        const sceneErrors = [];
        
        if (!scene.sceneNumber || typeof scene.sceneNumber !== 'number') {
            sceneErrors.push('Missing or invalid scene number');
        }
        
        if (!scene.description || typeof scene.description !== 'string') {
            sceneErrors.push('Missing or invalid scene description');
        }
        
        if (!scene.visualPrompt || typeof scene.visualPrompt !== 'string') {
            sceneErrors.push('Missing or invalid visual prompt');
        }
        
        if (!Array.isArray(scene.characters)) {
            sceneErrors.push('Characters must be an array');
        }
        
        if (!scene.setting || typeof scene.setting !== 'string') {
            sceneErrors.push('Missing or invalid setting');
        }
        
        if (scene.duration && (typeof scene.duration !== 'number' || scene.duration < 2 || scene.duration > 10)) {
            sceneErrors.push('Duration must be between 2-10 seconds');
        }
        
        if (sceneErrors.length > 0) {
            errors.push(`Scene ${index + 1}: ${sceneErrors.join(', ')}`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validate API keys configuration
 */
const validateAPIKeys = () => {
    const status = {
        gemini: !!process.env.GEMINI_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        googleCloud: !!process.env.GOOGLE_CLOUD_API_KEY
    };
    
    const warnings = [];
    
    if (!status.gemini) {
        warnings.push('GEMINI_API_KEY missing - story analysis and image generation will fail');
    }
    
    if (!status.elevenlabs) {
        warnings.push('ELEVENLABS_API_KEY missing - will use Google Cloud fallbacks');
    }
    
    if (!status.googleCloud) {
        warnings.push('GOOGLE_CLOUD_API_KEY missing - no fallback for audio services');
    }
    
    return {
        status,
        warnings,
        ready: status.gemini && (status.elevenlabs || status.googleCloud)
    };
};

/**
 * Validate video generation requirements
 */
const validateVideoRequirements = (scenes) => {
    const errors = [];
    
    scenes.forEach((scene, index) => {
        if (!scene.image?.imageUrl && !scene.imageUrl) {
            errors.push(`Scene ${index + 1} missing image URL`);
        }
        
        if (scene.image?.imageUrl && !scene.image.imageUrl.startsWith('http') && !scene.image.imageUrl.startsWith('data:')) {
            errors.push(`Scene ${index + 1} has invalid image URL format`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateStoryInput,
    validateScenes,
    validateAPIKeys,
    validateVideoRequirements
};