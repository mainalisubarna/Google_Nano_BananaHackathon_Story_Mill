// No longer using FFmpeg due to Windows compatibility issues
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas'); // Using node-canvas instead of FFmpeg
const { generateId } = require('../utils/apiHelpers');
const { PassThrough } = require('stream');
const archiver = require('archiver'); // For creating ZIP files

// Videos directory for backward compatibility only
const videosDir = path.join(__dirname, '../videos');

// Ensure videos directory exists
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log('✅ Videos directory created successfully');
}

/**
 * Create story presentation assets (images + HTML viewer) instead of MP4
 */
const createStoryVideo = async (scenes, title = 'StoryMill Generated Story') => {
    const videoId = generateId();
    const tempDir = path.join(__dirname, '../temp', videoId);
    const outputZipPath = path.join(tempDir, `storymill_${videoId}.zip`); // Store as ZIP file

    try {
        // Create temp directory for this video
        fs.mkdirSync(tempDir, { recursive: true });

        console.log(`Creating presentation package for ${scenes.length} scenes...`);

        // Download and prepare all assets
        const preparedScenes = await prepareVideoAssets(scenes, tempDir);
        
        // Create HTML presentation viewer
        await generateHTMLPresentation(preparedScenes, tempDir, title);
        
        // Create GIF preview
        const gifPath = await generateGIFPreview(preparedScenes, tempDir);
        
        // Create ZIP archive with all content
        await createZipArchive(tempDir, outputZipPath);

        const videoData = {
            videoId: videoId,
            title: title || 'StoryMill Generated Story',
            videoPath: outputZipPath,
            tempDir: tempDir, // Include temp dir for cleanup
            downloadUrl: `/api/video/download/${videoId}`,
            totalDuration: scenes.reduce((sum, scene) => sum + (scene.duration || 4), 0),
            scenes: preparedScenes.length,
            metadata: {
                createdAt: new Date().toISOString(),
                format: 'html-presentation',
                resolution: '1920x1080',
                temporary: true // Mark as temporary
            }
        };

        console.log(`✅ Presentation package created: ${outputZipPath}`);

        // Schedule cleanup after 1 hour
        setTimeout(() => {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log(`🗑️ Cleaned up temporary presentation: ${videoId}`);
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
 * Generate HTML presentation with images, text, and basic transition effects
 */
const generateHTMLPresentation = async (scenes, outputDir, title) => {
    const htmlPath = path.join(outputDir, 'index.html');
    const cssPath = path.join(outputDir, 'styles.css');
    const jsPath = path.join(outputDir, 'script.js');
    
    // Copy all images to a consistent location with proper naming
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (scene.imagePath && fs.existsSync(scene.imagePath)) {
            const newImagePath = path.join(outputDir, `scene_${i + 1}.jpg`);
            fs.copyFileSync(scene.imagePath, newImagePath);
            scene.webImagePath = `scene_${i + 1}.jpg`;
        }
        
        // Copy audio if available
        if (scene.audioPath && fs.existsSync(scene.audioPath)) {
            const newAudioPath = path.join(outputDir, `scene_${i + 1}_narration.mp3`);
            fs.copyFileSync(scene.audioPath, newAudioPath);
            scene.webAudioPath = `scene_${i + 1}_narration.mp3`;
        }
        
        // Ambient sound functionality removed as it's not used
    }
    
    // Generate HTML content
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="story-container">
        <header>
            <h1>${title}</h1>
            <div class="controls">
                <button id="prevBtn">Previous</button>
                <button id="playBtn">Play</button>
                <button id="nextBtn">Next</button>
                <div class="progress-container">
                    <div id="progress-bar"></div>
                </div>
            </div>
        </header>
        
        <div id="slideshow">
            ${scenes.map((scene, index) => `
            <div class="slide" data-index="${index}" ${scene.webAudioPath ? `data-audio="${scene.webAudioPath}"` : ''} data-duration="${scene.duration || 4}">
                <div class="slide-image" style="background-image: url('${scene.webImagePath}')"></div>
                <div class="slide-content">
                    <div class="narration">${scene.description || ''}</div>
                </div>
            </div>
            `).join('')}
        </div>
        
        <div class="thumbnails">
            ${scenes.map((scene, index) => `
            <div class="thumbnail" data-index="${index}">
                <div class="thumb-img" style="background-image: url('${scene.webImagePath}')"></div>
                <div class="thumb-num">${index + 1}</div>
            </div>
            `).join('')}
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>`;

    // Generate CSS content
    const cssContent = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Arial', sans-serif;
}

body {
    background-color: #111;
    color: #fff;
    overflow-x: hidden;
}

.story-container {
    max-width: 100%;
    margin: 0 auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

header {
    padding: 20px 0;
    text-align: center;
}

header h1 {
    margin-bottom: 20px;
    color: #f0f0f0;
    font-size: 2rem;
}

.controls {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
}

button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
}

button:hover {
    background-color: #2980b9;
}

.progress-container {
    width: 100%;
    height: 10px;
    background-color: #333;
    margin-top: 20px;
    border-radius: 5px;
    overflow: hidden;
}

#progress-bar {
    height: 100%;
    background-color: #3498db;
    width: 0;
    transition: width 0.3s;
}

#slideshow {
    position: relative;
    width: 100%;
    height: 70vh;
    overflow: hidden;
    margin-bottom: 20px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    border-radius: 5px;
}

.slide {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 1s ease-in-out;
    display: flex;
    flex-direction: column;
}

.slide.active {
    opacity: 1;
    z-index: 1;
}

.slide-image {
    flex: 1;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

.slide-content {
    padding: 20px;
    background: rgba(0, 0, 0, 0.7);
    max-height: 30%;
    overflow-y: auto;
}

.narration {
    font-size: 1.2rem;
    line-height: 1.6;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.thumbnails {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 10px 0;
    margin-top: auto;
}

.thumbnail {
    flex: 0 0 120px;
    height: 80px;
    position: relative;
    border: 2px solid transparent;
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s;
}

.thumbnail.active {
    border-color: #3498db;
    transform: scale(1.05);
}

.thumb-img {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
}

.thumb-num {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background: rgba(0, 0, 0, 0.7);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.8rem;
}

@media (max-width: 768px) {
    #slideshow {
        height: 50vh;
    }
    
    .thumbnails {
        gap: 5px;
    }
    
    .thumbnail {
        flex: 0 0 80px;
        height: 60px;
    }
    
    .narration {
        font-size: 1rem;
    }
}`;

    // Generate JS content
    const jsContent = `document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const slideshow = document.getElementById('slideshow');
    const slides = document.querySelectorAll('.slide');
    const thumbnails = document.querySelectorAll('.thumbnail');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const playBtn = document.getElementById('playBtn');
    const progressBar = document.getElementById('progress-bar');
    
    // Variables
    let currentSlide = 0;
    let isPlaying = false;
    let slideInterval;
    let audioElements = {};
    
    // Initialize
    function init() {
        showSlide(0);
        
        // Preload audio
        slides.forEach((slide, index) => {
            const audioSrc = slide.dataset.audio;
            
            if (audioSrc) {
                const audio = new Audio(audioSrc);
                audio.preload = 'auto';
                audioElements[index] = audio;
            }
        });
    }
    
    // Show slide
    function showSlide(index) {
        // Stop any playing audio
        Object.values(audioElements).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        // Remove active class from all slides and thumbnails
        slides.forEach(slide => slide.classList.remove('active'));
        thumbnails.forEach(thumb => thumb.classList.remove('active'));
        
        // Add active class to current slide and thumbnail
        slides[index].classList.add('active');
        thumbnails[index].classList.add('active');
        
        // Play audio if available
        if (audioElements[index]) {
            audioElements[index].play();
        }
        
        // Update current slide
        currentSlide = index;
        
        // Update progress bar
        updateProgress();
    }
    
    // Next slide
    function nextSlide() {
        if (currentSlide < slides.length - 1) {
            showSlide(currentSlide + 1);
        } else {
            showSlide(0); // Loop back to first slide
        }
    }
    
    // Previous slide
    function prevSlide() {
        if (currentSlide > 0) {
            showSlide(currentSlide - 1);
        } else {
            showSlide(slides.length - 1); // Loop to last slide
        }
    }
    
    // Play slideshow
    function playSlideshow() {
        if (isPlaying) {
            clearInterval(slideInterval);
            playBtn.textContent = 'Play';
            isPlaying = false;
        } else {
            const duration = parseInt(slides[currentSlide].dataset.duration) * 1000 || 4000;
            playBtn.textContent = 'Pause';
            isPlaying = true;
            
            // Wait for current slide duration before advancing
            slideInterval = setTimeout(() => {
                nextSlide();
                // After advancing, continue with regular interval
                slideInterval = setInterval(() => {
                    const nextIndex = (currentSlide + 1) % slides.length;
                    showSlide(nextIndex);
                    
                    // If we've looped back to the beginning, stop playing
                    if (nextIndex === 0) {
                        clearInterval(slideInterval);
                        playBtn.textContent = 'Play';
                        isPlaying = false;
                    }
                }, duration);
            }, duration);
        }
    }
    
    // Update progress bar
    function updateProgress() {
        const progress = (currentSlide / (slides.length - 1)) * 100;
        progressBar.style.width = \`\${progress}%\`;
    }
    
    // Event listeners
    prevBtn.addEventListener('click', () => {
        if (isPlaying) {
            clearInterval(slideInterval);
            playBtn.textContent = 'Play';
            isPlaying = false;
        }
        prevSlide();
    });
    
    nextBtn.addEventListener('click', () => {
        if (isPlaying) {
            clearInterval(slideInterval);
            playBtn.textContent = 'Play';
            isPlaying = false;
        }
        nextSlide();
    });
    
    playBtn.addEventListener('click', playSlideshow);
    
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            if (isPlaying) {
                clearInterval(slideInterval);
                playBtn.textContent = 'Play';
                isPlaying = false;
            }
            showSlide(index);
        });
    });
    
    // Initialize slideshow
    init();
});`;

    // Write files
    fs.writeFileSync(htmlPath, htmlContent);
    fs.writeFileSync(cssPath, cssContent);
    fs.writeFileSync(jsPath, jsContent);
    
    console.log(`✅ HTML presentation created at ${htmlPath}`);
    return htmlPath;
};

/**
 * Generate a preview image from the first scene
 * (Simplified version that just creates a thumbnail image instead of an animated GIF)
 */
const generateGIFPreview = async (scenes, outputDir) => {
    const previewPath = path.join(outputDir, 'preview.jpg');
    const width = 320;
    const height = 180;
    
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    try {
        // Use the first scene for preview
        const scene = scenes[0];
        
        // Fill with black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        if (scene.imagePath && fs.existsSync(scene.imagePath)) {
            const image = await loadImage(scene.imagePath);
            
            // Calculate aspect ratio to maintain proportions
            const aspectRatio = image.width / image.height;
            let drawWidth, drawHeight;
            
            if (aspectRatio > width / height) {
                // Image is wider
                drawWidth = width;
                drawHeight = width / aspectRatio;
            } else {
                // Image is taller
                drawHeight = height;
                drawWidth = height * aspectRatio;
            }
            
            // Center the image
            const x = (width - drawWidth) / 2;
            const y = (height - drawHeight) / 2;
            
            // Draw image
            ctx.drawImage(image, x, y, drawWidth, drawHeight);
            
            // Add "preview" text
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, height - 30, width, 30);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Preview - Download for full story', width / 2, height - 15);
            
            // Save to file
            const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
            fs.writeFileSync(previewPath, buffer);
            
            console.log(`✅ Preview image created at ${previewPath}`);
            return previewPath;
        }
    } catch (error) {
        console.error('Error generating preview image:', error);
    }
    
    // Create a fallback preview if the above fails
    try {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Story Preview', width / 2, height / 2 - 20);
        
        ctx.font = '14px Arial';
        ctx.fillText('Download to view full presentation', width / 2, height / 2 + 20);
        
        // Save to file
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        fs.writeFileSync(previewPath, buffer);
        
        console.log(`✅ Fallback preview image created at ${previewPath}`);
        return previewPath;
    } catch (error) {
        console.error('Error generating fallback preview:', error);
        return null;
    }
};

/**
 * Create a ZIP archive with all presentation content
 */
const createZipArchive = async (sourceDir, outputZipPath) => {
    return new Promise((resolve, reject) => {
        // Create output stream
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        
        // Listen for all archive data to be written
        output.on('close', () => {
            console.log(`✅ ZIP archive created: ${outputZipPath} (${archive.pointer()} bytes)`);
            resolve(outputZipPath);
        });
        
        archive.on('error', (err) => {
            reject(err);
        });
        
        // Pipe archive data to the output file
        archive.pipe(output);
        
        // Add all files from the source directory
        archive.directory(sourceDir, false);
        
        // Finalize the archive
        archive.finalize();
    });
};

/**
 * Get video file for download - from temp directory
 */
const getVideoFile = (videoId) => {
    // Check for ZIP file (new approach)
    const zipPath = path.join(__dirname, '../temp', videoId, `storymill_${videoId}.zip`);
    
    if (fs.existsSync(zipPath)) {
        return {
            path: zipPath,
            filename: `storymill_${videoId}.zip`,
            size: fs.statSync(zipPath).size,
            temporary: true,
            format: 'zip'
        };
    }
    
    // Try temp directory for MP4 (backward compatibility)
    const tempVideoPath = path.join(__dirname, '../temp', videoId, `storymill_${videoId}.mp4`);

    if (fs.existsSync(tempVideoPath)) {
        return {
            path: tempVideoPath,
            filename: `storymill_${videoId}.mp4`,
            size: fs.statSync(tempVideoPath).size,
            temporary: true,
            format: 'mp4'
        };
    }

    // Fallback to old videos directory (for backward compatibility)
    const videoPath = path.join(videosDir, `storymill_${videoId}.mp4`);

    if (fs.existsSync(videoPath)) {
        return {
            path: videoPath,
            filename: `storymill_${videoId}.mp4`,
            size: fs.statSync(videoPath).size,
            temporary: false,
            format: 'mp4'
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