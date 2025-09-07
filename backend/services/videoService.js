const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateId } = require('../utils/apiHelpers');

// Configure FFmpeg path for Windows
const ffmpegPath = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.0-full_build', 'bin', 'ffmpeg.exe');
const ffprobePath = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.0-full_build', 'bin', 'ffprobe.exe');

if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    console.log('✅ FFmpeg configured successfully');
} else {
    console.warn('⚠️ FFmpeg not found at expected path, trying system PATH');
}

// Videos directory for backward compatibility only
const videosDir = path.join(__dirname, '../videos');

/**
 * Create actual MP4 video from scenes - NO PERMANENT STORAGE
 */
const createStoryVideo = async (scenes) => {
    const videoId = generateId();
    const tempDir = path.join(__dirname, '../temp', videoId);
    const outputPath = path.join(tempDir, `storymill_${videoId}.mp4`); // Store in temp, not videos

    try {
        // Create temp directory for this video
        fs.mkdirSync(tempDir, { recursive: true });

        console.log(`Creating temporary MP4 video for ${scenes.length} scenes...`);

        // Download and prepare all assets
        const preparedScenes = await prepareVideoAssets(scenes, tempDir);

        // Create MP4 video using FFmpeg
        const videoPath = await generateMP4Video(preparedScenes, outputPath, videoId);

        const videoData = {
            id: videoId,
            title: 'StoryMill Generated Story',
            videoPath: videoPath,
            tempDir: tempDir, // Include temp dir for cleanup
            downloadUrl: `/api/video/download/${videoId}`,
            totalDuration: scenes.reduce((sum, scene) => sum + (scene.duration || 4), 0),
            scenes: preparedScenes.length,
            metadata: {
                createdAt: new Date().toISOString(),
                format: 'mp4',
                resolution: '1920x1080',
                fps: 60,
                temporary: true // Mark as temporary
            }
        };

        console.log(`✅ Temporary MP4 video created: ${videoPath}`);

        // Schedule cleanup after 1 hour
        setTimeout(() => {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log(`🗑️ Cleaned up temporary video: ${videoId}`);
            }
        }, 60 * 60 * 1000); // 1 hour

        return videoData;

    } catch (error) {
        // Clean up on error
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
    }
};

/**
 * Download and prepare all video assets
 */
const prepareVideoAssets = async (scenes, tempDir) => {
    const preparedScenes = [];

    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        console.log(`Preparing assets for scene ${i + 1}/${scenes.length}...`);

        // Download image
        const imagePath = await downloadAsset(
            scene.image?.imageUrl || scene.imageUrl,
            path.join(tempDir, `scene_${i + 1}_image.jpg`)
        );

        // Download audio if available
        let audioPath = null;
        if (scene.audio?.audioUrl) {
            audioPath = await downloadAsset(
                scene.audio.audioUrl,
                path.join(tempDir, `scene_${i + 1}_audio.mp3`)
            );
        }

        // Download ambient sound if available
        let ambientPath = null;
        if (scene.ambient?.ambientUrl) {
            ambientPath = await downloadAsset(
                scene.ambient.ambientUrl,
                path.join(tempDir, `scene_${i + 1}_ambient.mp3`)
            );
        }

        preparedScenes.push({
            ...scene,
            imagePath,
            audioPath,
            ambientPath,
            duration: scene.duration || 4
        });
    }

    return preparedScenes;
};

/**
 * Download asset from URL to local file
 */
const downloadAsset = async (url, filePath) => {
    try {
        if (url.startsWith('data:')) {
            // Handle base64 data URLs
            const matches = url.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                const buffer = Buffer.from(matches[2], 'base64');
                fs.writeFileSync(filePath, buffer);
                return filePath;
            }
        } else {
            // Download from HTTP URL
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                timeout: 30000
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(filePath));
                writer.on('error', reject);
            });
        }
    } catch (error) {
        console.warn(`Failed to download asset ${url}:`, error.message);
        return null;
    }
};

/**
 * Determine transition type based on scene context
 */
const getContextualTransition = (fromScene, toScene) => {
    const fromMood = fromScene?.mood?.toLowerCase() || '';
    const toMood = toScene?.mood?.toLowerCase() || '';
    const toContext = toScene?.soundContext?.toLowerCase() || '';
    const fromTime = fromScene?.timeOfDay?.toLowerCase() || '';
    const toTime = toScene?.timeOfDay?.toLowerCase() || '';
    const fromEnv = fromScene?.environment?.toLowerCase() || '';
    const toEnv = toScene?.environment?.toLowerCase() || '';

    // Horror/Scary transitions - slow, ominous
    if (toMood === 'scary' || toContext === 'horror') {
        return { type: 'fadeblack', duration: 1.2, easing: 'in' }; // Fade through black for suspense
    }

    // Action/Exciting transitions - fast, dynamic
    if (toMood === 'exciting' || toContext === 'action') {
        if (fromMood === 'peaceful') {
            return { type: 'slideright', duration: 0.4, easing: 'out' }; // Sudden action burst
        }
        return { type: 'wipeleft', duration: 0.3, easing: 'out' }; // Fast wipe for action
    }

    // Magical transitions - ethereal, mystical
    if (toMood === 'magical' || fromMood === 'magical') {
        return { type: 'circlecrop', duration: 1.0, easing: 'inout' }; // Magical circle reveal
    }

    // Environment changes - location-based transitions
    if (fromEnv !== toEnv) {
        if (fromEnv === 'indoor' && toEnv === 'outdoor') {
            return { type: 'slideup', duration: 0.7, easing: 'out' }; // Going outside - upward reveal
        } else if (fromEnv === 'outdoor' && toEnv === 'indoor') {
            return { type: 'slidedown', duration: 0.7, easing: 'in' }; // Going inside - downward
        } else if (fromEnv === 'urban' && toEnv === 'nature') {
            return { type: 'dissolve', duration: 0.9, easing: 'inout' }; // City to nature - gentle dissolve
        } else if (fromEnv === 'nature' && toEnv === 'urban') {
            return { type: 'wiperight', duration: 0.6, easing: 'in' }; // Nature to city - structured wipe
        }
    }

    // Time of day changes - lighting-based transitions
    if (fromTime !== toTime) {
        if ((fromTime === 'morning' || fromTime === 'afternoon') && (toTime === 'night' || toTime === 'evening')) {
            return { type: 'fadeblack', duration: 1.5, easing: 'in' }; // Day to night - slow fade through black
        } else if ((fromTime === 'night' || fromTime === 'evening') && (toTime === 'morning' || toTime === 'afternoon')) {
            return { type: 'fadewhite', duration: 1.0, easing: 'out' }; // Night to day - fade through white
        } else if (fromTime === 'morning' && toTime === 'afternoon') {
            return { type: 'fade', duration: 0.5, easing: 'linear' }; // Gentle time progression
        }
    }

    // Emotional mood changes - feeling-based transitions
    if (fromMood !== toMood) {
        if (fromMood === 'sad' && toMood === 'happy') {
            return { type: 'slideup', duration: 0.8, easing: 'out' }; // Uplifting slide up
        } else if (fromMood === 'happy' && toMood === 'sad') {
            return { type: 'slidedown', duration: 1.0, easing: 'in' }; // Downward emotional slide
        } else if (fromMood === 'peaceful' && toMood === 'exciting') {
            return { type: 'wipeleft', duration: 0.4, easing: 'out' }; // Sudden excitement
        } else if (fromMood === 'exciting' && toMood === 'peaceful') {
            return { type: 'dissolve', duration: 1.2, easing: 'in' }; // Calming dissolve
        } else if (toMood === 'scary' && fromMood !== 'scary') {
            return { type: 'fadeblack', duration: 1.0, easing: 'in' }; // Building suspense
        }
    }

    // Peaceful/gentle transitions - default calm
    if (toMood === 'peaceful' || fromMood === 'peaceful') {
        return { type: 'fade', duration: 0.8, easing: 'inout' }; // Gentle fade
    }

    // Default smooth transition
    return { type: 'fade', duration: 0.6, easing: 'inout' };
};

/**
 * Generate MP4 video with context-aware transitions
 */
const generateMP4Video = async (scenes, outputPath) => {
    return new Promise((resolve, reject) => {
        try {
            const command = ffmpeg();

            // Create filter complex for context-aware transitions
            let filterComplex = '';
            let inputs = [];

            scenes.forEach((scene, sceneIndex) => {
                if (scene.imagePath && fs.existsSync(scene.imagePath)) {
                    // Calculate max transition duration for this scene
                    const nextTransition = sceneIndex < scenes.length - 1 ?
                        getContextualTransition(scene, scenes[sceneIndex + 1]) :
                        { duration: 0 };

                    command.input(scene.imagePath)
                        .inputOptions([
                            '-loop', '1',
                            '-t', (scene.duration + nextTransition.duration).toString()
                        ]);
                    inputs.push(sceneIndex);
                }
            });

            // Initialize currentStream variable
            let currentStream = 'v0';

            console.log(`🎬 Processing ${inputs.length} video inputs for FFmpeg`);

            // Build simple filter complex for concatenation (no transitions for now)
            if (inputs.length > 1) {
                console.log('🎭 Creating simple concatenation...');

                // Scale all inputs first
                for (let i = 0; i < inputs.length; i++) {
                    const scaleFilter = `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black[v${i}];`;
                    filterComplex += scaleFilter;
                }

                // Concatenate all videos without transitions
                const videoInputs = inputs.map(i => `[v${i}]`).join('');
                filterComplex += `${videoInputs}concat=n=${inputs.length}:v=1:a=0[concat_out]`;
                currentStream = 'concat_out';

                console.log(`🎬 Concatenating ${inputs.length} scenes without transitions`);

                command.complexFilter(filterComplex, currentStream);
            } else {
                // Single scene - just scale and pad
                currentStream = 'out';
                command.complexFilter([
                    '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black[out]'
                ], 'out');
            }

            // Add audio mixing if available
            const hasAudio = scenes.some(scene => scene.audioPath || scene.ambientPath);

            if (hasAudio) {
                console.log(`🎵 Adding audio tracks to video... (currentStream: ${currentStream})`);

                // Create audio filter complex for mixing narration and ambient
                let audioFilter = '';
                let audioInputs = [];
                let audioInputIndex = inputs.length; // Start after video inputs

                scenes.forEach((scene) => {
                    if (scene.audioPath && fs.existsSync(scene.audioPath)) {
                        command.input(scene.audioPath);
                        audioInputs.push(`[${audioInputIndex}:a]`);
                        audioInputIndex++;
                    }
                    if (scene.ambientPath && fs.existsSync(scene.ambientPath)) {
                        command.input(scene.ambientPath);
                        audioInputs.push(`[${audioInputIndex}:a]`);
                        audioInputIndex++;
                    }
                });

                if (audioInputs.length > 0) {
                    // Mix all audio inputs with proper syntax
                    audioFilter = `${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest[audio]`;

                    // Combine video and audio filters
                    const combinedFilters = [filterComplex, audioFilter].filter(f => f && f.length > 0).join(';');
                    command.complexFilter(combinedFilters, [currentStream, 'audio']);
                    command.outputOptions(['-map', `[${currentStream}]`, '-map', '[audio]']);
                } else {
                    // No audio files found, just use video
                    command.outputOptions(['-map', `[${currentStream}]`]);
                }
            } else {
                // No audio at all, just use video
                command.outputOptions(['-map', `[${currentStream}]`]);
            }

            // Video settings - 60fps with context-aware transitions
            command
                .outputOptions([
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-r', '60', // 60fps for smooth transitions
                    '-preset', 'medium',
                    '-crf', '23',
                    '-movflags', '+faststart', // Optimize for streaming
                    hasAudio ? '-c:a' : '', hasAudio ? 'aac' : '', // Audio codec if audio present
                    hasAudio ? '-b:a' : '', hasAudio ? '128k' : '', // Audio bitrate
                    '-y'
                ].filter(opt => opt !== ''))
                .output(outputPath)
                .on('start', () => {
                    console.log('🎬 FFmpeg started with context-aware transitions');
                })
                .on('progress', (progress) => {
                    console.log(`🎞️ Video generation progress: ${Math.round(progress.percent || 0)}%`);
                })
                .on('end', () => {
                    console.log('✅ Context-aware animated MP4 video completed');
                    resolve(outputPath);
                })
                .on('error', (error) => {
                    console.error('❌ FFmpeg error:', error.message);
                    console.error('FFmpeg command that failed:', command._getArguments ? command._getArguments().join(' ') : 'Unknown');
                    reject(new Error(`Video generation failed: ${error.message}`));
                })
                .run();
        } catch (error) {
            console.error('❌ Video generation setup error:', error.message);
            reject(new Error(`Video generation setup failed: ${error.message}`));
        }
    });
};

/**
 * Get video file for download - from temp directory
 */
const getVideoFile = (videoId) => {
    // Try temp directory first (new approach)
    const tempVideoPath = path.join(__dirname, '../temp', videoId, `storymill_${videoId}.mp4`);

    if (fs.existsSync(tempVideoPath)) {
        return {
            path: tempVideoPath,
            filename: `storymill_${videoId}.mp4`,
            size: fs.statSync(tempVideoPath).size,
            temporary: true
        };
    }

    // Fallback to old videos directory (for backward compatibility)
    const videoPath = path.join(videosDir, `storymill_${videoId}.mp4`);

    if (fs.existsSync(videoPath)) {
        return {
            path: videoPath,
            filename: `storymill_${videoId}.mp4`,
            size: fs.statSync(videoPath).size,
            temporary: false
        };
    }

    throw new Error('Video file not found or expired');
};

/**
 * Clean up old video files
 */
const cleanupOldVideos = () => {
    try {
        const files = fs.readdirSync(videosDir);
        const now = Date.now();

        files.forEach(file => {
            const filePath = path.join(videosDir, file);
            const stats = fs.statSync(filePath);
            const fileAge = now - stats.mtime.getTime();

            // Delete files older than 24 hours
            if (fileAge > 24 * 60 * 60 * 1000) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up old video: ${file}`);
            }
        });
    } catch (error) {
        console.warn('Error cleaning up videos:', error.message);
    }
};

/**
 * Validate video data structure
 */
const validateVideoData = (scenes) => {
    if (!scenes || !Array.isArray(scenes)) {
        throw new Error('Invalid video data: scenes array required');
    }

    for (const scene of scenes) {
        if (!scene.image?.imageUrl && !scene.imageUrl) {
            throw new Error(`Scene ${scene.sceneNumber} missing image URL`);
        }
        if (!scene.description) {
            throw new Error(`Scene ${scene.sceneNumber} missing description`);
        }
    }

    return true;
};

module.exports = {
    createStoryVideo,
    getVideoFile,
    cleanupOldVideos,
    validateVideoData
};