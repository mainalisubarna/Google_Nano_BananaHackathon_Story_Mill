#!/usr/bin/env node

/**
 * StoryMill Video Generation Test
 * Tests the video generation with mock data
 */

require('dotenv').config();
const { createStoryVideo } = require('./services/videoService');

const testVideoGeneration = async () => {
    console.log('🎬 Testing StoryMill Video Generation\n');
    
    // Create mock scenes data
    const mockScenes = [
        {
            sceneNumber: 1,
            description: "A brave little mouse stands in front of a magical castle",
            image: {
                imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                provider: "test"
            },
            audio: {
                audioUrl: "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwBK8AAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
                duration: 3,
                provider: "test"
            },
            ambient: {
                ambientUrl: null,
                type: 'none',
                volume: 0,
                provider: 'none'
            },
            duration: 4,
            mood: 'peaceful',
            environment: 'outdoor'
        },
        {
            sceneNumber: 2,
            description: "The mouse discovers a hidden treasure chest",
            image: {
                imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                provider: "test"
            },
            audio: {
                audioUrl: "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwBK8AAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
                duration: 3,
                provider: "test"
            },
            ambient: {
                ambientUrl: null,
                type: 'none',
                volume: 0,
                provider: 'none'
            },
            duration: 4,
            mood: 'exciting',
            environment: 'indoor'
        }
    ];
    
    try {
        console.log('📝 Mock scenes created:');
        mockScenes.forEach(scene => {
            console.log(`   Scene ${scene.sceneNumber}: ${scene.description.substring(0, 50)}...`);
        });
        
        console.log('\n🎬 Starting video generation...');
        const videoResult = await createStoryVideo(mockScenes);
        
        console.log('\n✅ Video generation successful!');
        console.log(`   Video ID: ${videoResult.id}`);
        console.log(`   Duration: ${videoResult.totalDuration}s`);
        console.log(`   Scenes: ${videoResult.scenes}`);
        console.log(`   Format: ${videoResult.metadata.format}`);
        console.log(`   Resolution: ${videoResult.metadata.resolution}`);
        console.log(`   FPS: ${videoResult.metadata.fps}`);
        console.log(`   Download URL: ${videoResult.downloadUrl}`);
        
        if (videoResult.videoPath) {
            const fs = require('fs');
            if (fs.existsSync(videoResult.videoPath)) {
                const stats = fs.statSync(videoResult.videoPath);
                console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   File path: ${videoResult.videoPath}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Video generation failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Make sure FFmpeg is installed and in PATH');
        console.log('2. Check if temp directory has write permissions');
        console.log('3. Verify all scene data has required fields');
        console.log('4. Check FFmpeg version: ffmpeg -version');
    }
};

// Run the test
testVideoGeneration();