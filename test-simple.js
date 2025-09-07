const axios = require('axios');

async function testSceneGeneration() {
    try {
        console.log('🧪 Testing scene generation API...');
        
        const testStory = "Once upon a time, there was a magical candy that could grant wishes. A little girl found it and made three wishes.";
        
        const response = await axios.post('http://localhost:3001/api/story/generate-scenes', {
            storyText: testStory
        });

        if (response.data.success) {
            console.log('✅ Scene generation successful!');
            console.log(`📊 Generated ${response.data.totalScenes} scenes`);
            
            if (response.data.scenes.length > 0) {
                const firstScene = response.data.scenes[0];
                console.log('\n📝 First scene preview:');
                console.log(`Text: ${firstScene.text?.substring(0, 100)}...`);
                console.log(`Has image: ${!!firstScene.image}`);
            }
        } else {
            console.error('❌ Scene generation failed:', response.data.error);
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Network Error:', error.message);
        }
    }
}

// Test TTS as well
async function testTTS() {
    try {
        console.log('\n🔊 Testing text-to-speech API...');
        
        const response = await axios.post('http://localhost:3001/api/story/text-to-speech', {
            text: "Hello, this is a test of the text to speech functionality."
        });

        if (response.data.success) {
            console.log('✅ Text-to-speech successful!');
            console.log(`🎵 Audio URL length: ${response.data.audioUrl?.length || 0} characters`);
            console.log(`⏱️ Duration: ${response.data.duration}s`);
        } else {
            console.error('❌ TTS failed:', response.data.error);
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ TTS API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ TTS Network Error:', error.message);
        }
    }
}

async function runTests() {
    await testSceneGeneration();
    await testTTS();
}

runTests();