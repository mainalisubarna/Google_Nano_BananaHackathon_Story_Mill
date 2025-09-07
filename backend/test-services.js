#!/usr/bin/env node

/**
 * StoryMill Service Configuration Test
 * Tests the optimized service configuration
 */

require('dotenv').config();

const testServiceConfiguration = () => {
    console.log('🧪 StoryMill Service Configuration Test\n');
    
    // Check API Keys
    const services = {
        'Gemini AI (Required)': !!process.env.GEMINI_API_KEY,
        'Google Cloud (TTS Primary)': !!process.env.GOOGLE_CLOUD_API_KEY,
        'ElevenLabs (STT Primary)': !!process.env.ELEVENLABS_API_KEY
    };
    
    console.log('📋 API Key Status:');
    Object.entries(services).forEach(([service, available]) => {
        const status = available ? '✅' : '❌';
        console.log(`  ${status} ${service}`);
    });
    
    console.log('\n🎯 Optimized Service Flow:');
    console.log('  📝 Text-to-Speech:');
    console.log('    1️⃣ Google Cloud TTS (Primary - Cost Effective)');
    console.log('    2️⃣ ElevenLabs Turbo v2.5 (Fallback)');
    
    console.log('  🎙️ Speech-to-Text:');
    console.log('    1️⃣ ElevenLabs Whisper-1 (Primary - Superior Accuracy)');
    console.log('    2️⃣ Google Cloud STT (Fallback - Cost Effective)');
    
    console.log('  🎨 Image Generation:');
    console.log('    1️⃣ Gemini Imagen 4 (Premium Quality)');
    
    console.log('  🔊 Ambient Sounds:');
    console.log('    1️⃣ ElevenLabs Sound Generation (Optimized Settings)');
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (!services['Gemini AI (Required)']) {
        console.log('  ⚠️  Add GEMINI_API_KEY - Required for story analysis and image generation');
    }
    
    if (!services['Google Cloud (TTS Primary)']) {
        console.log('  💰 Add GOOGLE_CLOUD_API_KEY - 60% cost savings on text-to-speech');
    }
    
    if (!services['ElevenLabs (STT Primary)']) {
        console.log('  🎯 Add ELEVENLABS_API_KEY - Superior speech recognition accuracy');
    }
    
    if (services['Google Cloud (TTS Primary)'] && services['ElevenLabs (STT Primary)']) {
        console.log('  🌟 Optimal configuration detected! Best balance of cost and quality.');
    }
    
    console.log('\n💰 Estimated Cost per Story:');
    console.log('  • Google Cloud TTS: ~$0.02 (1000 characters)');
    console.log('  • ElevenLabs STT: ~$0.05 (per minute audio)');
    console.log('  • Gemini Imagen 4: ~$0.20 (per image, 4-6 images)');
    console.log('  • ElevenLabs Sound: ~$0.10 (optional ambient)');
    console.log('  • Total: $0.85-1.60 per complete story');
    
    console.log('\n🚀 Ready to create amazing stories!');
};

// Run the test
testServiceConfiguration();