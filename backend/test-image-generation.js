#!/usr/bin/env node

/**
 * StoryMill Image Generation Test
 * Tests both Imagen 4.0 and Nano Banana image generation
 */

require('dotenv').config();
const { generateImage, editImage } = require('./services/imageService');

const testImageGeneration = async () => {
    console.log('🍌 Testing StoryMill Nano Banana Image Generation\n');
    
    if (!process.env.GEMINI_API_KEY) {
        console.log('❌ GEMINI_API_KEY not found in .env file');
        console.log('   Please add your Gemini API key to backend/.env');
        return;
    }
    
    const testPrompt = "A brave little mouse wearing a red cape, standing in front of a magical castle";
    
    console.log(`📝 Test Prompt: "${testPrompt}"\n`);
    
    // Test Nano Banana (Primary)
    try {
        console.log('🍌 Testing Nano Banana (Gemini 2.5 Flash Image Preview)...');
        const result = await generateImage(testPrompt, 'storybook illustration');
        
        console.log('✅ Nano Banana Success!');
        console.log(`   Provider: ${result.provider}`);
        console.log(`   Model: ${result.model}`);
        console.log(`   Image URL length: ${result.imageUrl.length} characters`);
        console.log(`   Cost level: ${result.cost}`);
        console.log(`   Quality: ${result.quality}`);
        console.log(`   Generated prompt: "${result.prompt.substring(0, 100)}..."`);
        
        // Test image editing if generation succeeded
        if (result.imageUrl) {
            console.log('\n✏️  Testing image editing...');
            try {
                const editResult = await editImage(
                    result.imageUrl, 
                    'add a golden crown on the mouse\'s head', 
                    testPrompt
                );
                
                console.log('✅ Image editing Success!');
                console.log(`   Edit method: ${editResult.method || editResult.editType}`);
                console.log(`   Edited image URL length: ${editResult.imageUrl.length} characters`);
                
            } catch (editError) {
                console.log('⚠️  Image editing failed:', editError.message);
            }
        }
        
    } catch (error) {
        console.log('❌ Nano Banana Failed:', error.message);
        console.log('Stack trace:', error.stack);
    }
    
    console.log('\n💡 Tips:');
    console.log('- Make sure your GEMINI_API_KEY is valid and has access to Gemini 2.5 Flash Image Preview');
    console.log('- Check your API quota and billing settings');
    console.log('- Verify you have the latest @google/genai package: npm install @google/genai@latest');
    console.log('- Ensure your API key has image generation permissions');
    
    console.log('\n📚 Official Documentation:');
    console.log('- Gemini Image Generation: https://ai.google.dev/gemini-api/docs/image-generation');
    console.log('- Nano Banana Guide: https://ai.google.dev/gemini-api/docs/vision');
    console.log('- Google GenAI SDK: https://www.npmjs.com/package/@google/genai');
};

// Run the test
testImageGeneration().catch(console.error);