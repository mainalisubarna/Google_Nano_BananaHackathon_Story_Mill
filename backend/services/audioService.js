const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { retryWithBackoff, sanitizeText } = require('../utils/apiHelpers');

/**
 * Convert text to speech using Google Cloud TTS (Primary) with ElevenLabs fallback
 */
const textToSpeech = async (text, voiceOptions = {}) => {
    const cleanText = sanitizeText(text);

    // Try Google Cloud TTS first (cheaper and high quality)
    if (process.env.GOOGLE_CLOUD_API_KEY) {
        try {
            console.log('🔊 Using Google Cloud TTS (primary)');
            return await googleCloudTextToSpeech(cleanText, voiceOptions);
        } catch (error) {
            console.warn('Google Cloud TTS failed, trying ElevenLabs fallback:', error.message);
        }
    }

    // Fallback to ElevenLabs if Google Cloud fails or not available
    if (process.env.ELEVENLABS_API_KEY) {
        try {
            console.log('🔊 Using ElevenLabs TTS (fallback)');
            return await elevenLabsTextToSpeech(cleanText, voiceOptions.voiceId);
        } catch (error) {
            console.error('ElevenLabs TTS also failed:', error.message);
        }
    }

    // If both fail, throw error
    throw new Error('All TTS services failed. Please check your API keys and try again.');
};

/**
 * Google Cloud Text-to-Speech (Primary - Cost Effective)
 * Using Standard voices (cheaper than Neural2)
 */
const googleCloudTextToSpeech = async (text, voiceOptions = {}) => {
    const response = await retryWithBackoff(async () => {
        return await axios.post(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
            {
                input: { text: text },
                voice: {
                    languageCode: voiceOptions.languageCode || 'en-US',
                    // Using Standard voices (cheaper than Neural2)
                    name: voiceOptions.voiceName || 'en-US-Standard-D', // Female voice
                    ssmlGender: voiceOptions.gender || 'NEUTRAL'
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: voiceOptions.speakingRate || 1.0,
                    pitch: voiceOptions.pitch || 0.0,
                    volumeGainDb: voiceOptions.volumeGain || 0.0
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    });

    return {
        audioUrl: `data:audio/mpeg;base64,${response.data.audioContent}`,
        text: text,
        duration: Math.max(2, text.length * 0.08),
        timestamp: new Date().toISOString(),
        provider: 'google-cloud-standard',
        cost: 'low' // Standard voices are $4 per 1M characters
    };
};

/**
 * ElevenLabs Text-to-Speech (Fallback)
 * Using Turbo v2.5 model (fastest and cheapest)
 */
const elevenLabsTextToSpeech = async (text, voiceId = 'pNInz6obpgDQGcFmaJgB') => {
    const response = await retryWithBackoff(async () => {
        return await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                text: text,
                // Using Turbo v2.5 - fastest and cheapest model
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                    style: 0.0,
                    use_speaker_boost: false // Disable for cost savings
                }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                responseType: 'arraybuffer'
            }
        );
    });

    // Convert audio buffer to base64 data URL
    const audioBase64 = Buffer.from(response.data).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    return {
        audioUrl,
        text: text,
        duration: Math.max(2, text.length * 0.08),
        timestamp: new Date().toISOString(),
        provider: 'elevenlabs-turbo',
        cost: 'medium' // Turbo v2.5 is cheaper than multilingual models
    };
};

/**
 * Transcribe audio using Google Cloud (Primary - Fastest) with ElevenLabs fallback
 */
const transcribeAudio = async (audioBuffer) => {
    // Try Google Cloud first (faster response time)
    if (process.env.GOOGLE_CLOUD_API_KEY) {
        try {
            console.log('🎙️ Using Google Cloud Speech-to-Text (primary - fastest)');
            const result = await Promise.race([
                googleCloudTranscription(audioBuffer),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Google Cloud timeout after 10 seconds')), 10000)
                )
            ]);
            return result;
        } catch (error) {
            console.warn('Google Cloud transcription failed, trying ElevenLabs fallback:', error.message);
        }
    }

    // Fallback to ElevenLabs if Google Cloud fails
    if (process.env.ELEVENLABS_API_KEY) {
        try {
            console.log('🎙️ Using ElevenLabs Speech-to-Text (fallback)');
            const result = await Promise.race([
                elevenLabsTranscription(audioBuffer),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('ElevenLabs timeout after 15 seconds')), 15000)
                )
            ]);
            return result;
        } catch (error) {
            console.error('ElevenLabs transcription also failed:', error.message);
        }
    }

    // If both fail, return error message
    return {
        transcript: "Audio transcription failed. Please check your internet connection or try typing your story instead.",
        confidence: 0.0,
        timestamp: new Date().toISOString(),
        provider: 'none'
    };
};

/**
 * Google Cloud Speech-to-Text (Primary - Fast & Reliable)
 * Optimized for speed and cost efficiency
 */
const googleCloudTranscription = async (audioBuffer) => {
    const audioBase64 = audioBuffer.toString('base64');

    const response = await retryWithBackoff(async () => {
        return await axios.post(
            `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
            {
                config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 48000,
                    languageCode: 'en-US',
                    enableAutomaticPunctuation: true,
                    // Using latest model for better speed/accuracy balance
                    model: 'latest_short',
                    useEnhanced: false
                },
                audio: {
                    content: audioBase64
                }
            },
            {
                timeout: 8000 // 8 second timeout for faster response
            }
        );
    });

    if (response.data.results && response.data.results.length > 0) {
        const transcript = response.data.results
            .map(result => result.alternatives[0].transcript)
            .join(' ');

        return {
            transcript,
            confidence: response.data.results[0].alternatives[0].confidence || 0.85, // Good confidence for primary
            timestamp: new Date().toISOString(),
            provider: 'google-cloud-primary',
            cost: 'low', // Standard model is $0.006 per 15 seconds
            quality: 'fast-and-accurate' // Optimized for speed
        };
    } else {
        throw new Error('No transcription results from Google Cloud');
    }
};

/**
 * ElevenLabs Speech-to-Text (Primary - Superior Accuracy)
 * Best for natural speech patterns and storytelling
 */
const elevenLabsTranscription = async (audioBuffer) => {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save audio buffer to temporary file
    const tempFilePath = path.join(tempDir, `audio_${Date.now()}.wav`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(tempFilePath));
    formData.append('model_id', 'whisper-1'); // Best model for storytelling accuracy

    const response = await retryWithBackoff(async () => {
        return await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
            headers: {
                ...formData.getHeaders(),
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            timeout: 12000 // 12 second timeout
        });
    });

    // Clean up temp file
    try {
        fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError.message);
    }

    return {
        transcript: response.data.text,
        confidence: 0.95, // Higher confidence due to superior accuracy
        timestamp: new Date().toISOString(),
        provider: 'elevenlabs-whisper-primary',
        cost: 'medium',
        quality: 'superior' // Best for natural speech and storytelling
    };
};

/**
 * Generate context-aware ambient sounds
 * Only use ElevenLabs for sound generation (no cheaper alternative available)
 */
const generateAmbientSound = async (scene) => {
    // Handle both old format (string) and new format (object)
    const description = typeof scene === 'string' ? scene : scene.description;
    const sceneContext = typeof scene === 'object' ? scene : {};

    if (!process.env.ELEVENLABS_API_KEY) {
        console.warn('ElevenLabs API key not found, skipping ambient sounds for cost optimization');
        return await getFallbackAmbientSound();
    }

    try {
        // Extract sound prompt using scene context
        const soundPrompt = extractContextualSoundPrompt(description, sceneContext);

        console.log(`🔊 Generating ambient sound: "${soundPrompt}"`);

        const response = await retryWithBackoff(async () => {
            return await axios.post('https://api.elevenlabs.io/v1/sound-generation', {
                text: soundPrompt,
                duration_seconds: Math.min(8, (sceneContext.duration || 4) + 2), // Shorter duration for cost savings
                prompt_influence: 0.3 // Lower influence for cost optimization
            }, {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                responseType: 'arraybuffer'
            });
        });

        // Convert audio buffer to base64 data URL
        const audioBase64 = Buffer.from(response.data).toString('base64');
        const ambientUrl = `data:audio/mpeg;base64,${audioBase64}`;

        return {
            ambientUrl,
            type: soundPrompt,
            volume: getContextualVolume(sceneContext),
            loop: true,
            provider: 'elevenlabs-sound-optimized',
            context: sceneContext.soundContext || 'general',
            cost: 'medium' // Sound generation is premium feature
        };
    } catch (error) {
        console.error('ElevenLabs sound generation error:', error.message);
        console.log('💡 Skipping ambient sounds to reduce costs');
        return await getFallbackAmbientSound();
    }
};

/**
 * Extract contextual sound prompt using scene metadata
 */
const extractContextualSoundPrompt = (description, context) => {
    const desc = description.toLowerCase();
    const mood = context.mood?.toLowerCase() || '';
    const environment = context.environment?.toLowerCase() || '';
    const weather = context.weather?.toLowerCase() || '';
    const timeOfDay = context.timeOfDay?.toLowerCase() || '';
    const soundContext = context.soundContext?.toLowerCase() || '';

    // Build contextual sound prompt
    let basePrompt = '';
    let atmosphereModifiers = [];

    // Base environment sounds
    if (environment === 'nature' || desc.includes('forest') || desc.includes('jungle')) {
        basePrompt = 'forest ambience, birds chirping, leaves rustling';
    } else if (environment === 'urban' || desc.includes('city') || desc.includes('street')) {
        basePrompt = 'urban city sounds, distant traffic, street ambience';
    } else if (desc.includes('ocean') || desc.includes('sea') || desc.includes('beach')) {
        basePrompt = 'ocean waves, seagulls, coastal wind';
    } else if (desc.includes('river') || desc.includes('stream')) {
        basePrompt = 'flowing river sounds, gentle water stream';
    } else if (desc.includes('market') || desc.includes('crowd')) {
        basePrompt = 'busy marketplace, people chattering, vendors calling';
    } else if (desc.includes('village') || desc.includes('town')) {
        basePrompt = 'peaceful village sounds, distant church bells';
    } else if (environment === 'indoor' || desc.includes('house') || desc.includes('room')) {
        basePrompt = 'cozy indoor ambience, gentle household sounds';
    } else {
        basePrompt = 'gentle nature ambience, peaceful background sounds';
    }

    // Add weather modifiers
    if (weather === 'rainy' || desc.includes('rain')) {
        atmosphereModifiers.push('rain falling, water droplets');
    } else if (weather === 'stormy' || desc.includes('storm')) {
        atmosphereModifiers.push('thunder rumbling, storm winds');
    } else if (weather === 'snowy' || desc.includes('snow')) {
        atmosphereModifiers.push('winter wind, snow falling');
    }

    // Add time of day modifiers
    if (timeOfDay === 'night' || desc.includes('night') || desc.includes('dark')) {
        atmosphereModifiers.push('nighttime ambience, crickets chirping');
    } else if (timeOfDay === 'morning' || desc.includes('morning')) {
        atmosphereModifiers.push('morning birds, gentle awakening sounds');
    }

    // Add mood-based modifiers
    if (mood === 'scary' || soundContext === 'horror' || desc.includes('scary') || desc.includes('dark')) {
        atmosphereModifiers.push('eerie whispers, mysterious creaking, haunting atmosphere');
    } else if (mood === 'exciting' || soundContext === 'action' || desc.includes('running') || desc.includes('chase')) {
        atmosphereModifiers.push('dramatic tension, footsteps, adventure sounds');
    } else if (mood === 'magical' || desc.includes('magic') || desc.includes('fairy')) {
        atmosphereModifiers.push('magical sparkles, mystical chimes, enchanted ambience');
    } else if (mood === 'peaceful' || mood === 'happy') {
        atmosphereModifiers.push('serene atmosphere, gentle breeze');
    } else if (mood === 'sad') {
        atmosphereModifiers.push('melancholic atmosphere, soft wind');
    }

    // Combine base prompt with modifiers
    const fullPrompt = atmosphereModifiers.length > 0
        ? `${basePrompt}, ${atmosphereModifiers.join(', ')}`
        : basePrompt;

    return fullPrompt;
};

/**
 * Get contextual volume based on scene mood and environment
 */
const getContextualVolume = (context) => {
    const mood = context.mood?.toLowerCase() || '';
    const soundContext = context.soundContext?.toLowerCase() || '';

    if (mood === 'scary' || soundContext === 'horror') {
        return 0.4; // Slightly louder for horror atmosphere
    } else if (mood === 'exciting' || soundContext === 'action') {
        return 0.35; // Moderate volume for action
    } else if (mood === 'peaceful' || mood === 'sad') {
        return 0.25; // Quieter for peaceful/sad scenes
    }

    return 0.3; // Default volume
};



/**
 * Fallback when ElevenLabs sound generation fails - return no ambient sound
 */
const getFallbackAmbientSound = async () => {
    console.warn('ElevenLabs sound generation failed, no ambient sound will be added');

    return {
        ambientUrl: null,
        type: 'none',
        volume: 0,
        loop: false,
        provider: 'none'
    };
};



/**
 * Generate context-aware narration for all scenes - OPTIMIZED PARALLEL
 */
const generateSceneNarration = async (scenes) => {
    console.log(`🎭 Generating contextual audio for ${scenes.length} scenes in parallel...`);

    // Generate all audio in parallel for speed
    const audioPromises = scenes.map(async (scene, index) => {
        // Add small staggered delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, index * 200));

        // Generate narration
        const audio = await textToSpeech(scene.description);

        return {
            ...scene,
            audio
        };
    });

    const narratedScenes = await Promise.all(audioPromises);

    return narratedScenes;
};

/**
 * Generate ONLY narration for slideshow approach (no ambient sounds)
 */
const generateSceneNarrationOnly = async (scenes) => {
    console.log(`🎭 Generating narration-only for ${scenes.length} scenes...`);

    // Generate all narration in parallel for speed
    const audioPromises = scenes.map(async (scene, index) => {
        // Use description property (consistent with other services) or fallback to other text properties
        const narrationText = scene.description || scene.text || scene.narration || '';
        
        if (!narrationText) {
            console.warn(`⚠️ Scene ${scene.sceneNumber || index + 1} has no text for narration`);
            return {
                ...scene,
                audio: null,
                ambient: null,
                error: 'No narration text available'
            };
        }
        
        console.log(`🎵 Processing scene ${scene.sceneNumber || index + 1}: ${narrationText.substring(0, 50)}...`);

        // Add small staggered delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, index * 300));

        try {
            // Generate ONLY narration (no ambient sounds)
            const audio = await textToSpeech(narrationText);

            return {
                ...scene,
                audio,
                // No ambient sound for slideshow approach
                ambient: null
            };
        } catch (error) {
            console.error(`❌ Failed to generate audio for scene ${scene.sceneNumber || index + 1}:`, error.message);
            return {
                ...scene,
                audio: null,
                ambient: null,
                error: `Audio generation failed: ${error.message}`
            };
        }
    });

    const narratedScenes = await Promise.all(audioPromises);
    
    // Filter out scenes with errors for logging
    const successfulScenes = narratedScenes.filter(scene => scene.audio !== null);
    const failedScenes = narratedScenes.filter(scene => scene.audio === null);

    console.log(`✅ Generated narration for ${successfulScenes.length}/${narratedScenes.length} scenes (slideshow mode)`);
    
    if (failedScenes.length > 0) {
        console.warn(`⚠️ ${failedScenes.length} scenes failed audio generation`);
    }

    return narratedScenes;
};


module.exports = {
    textToSpeech,
    transcribeAudio,
    generateSceneNarration
};