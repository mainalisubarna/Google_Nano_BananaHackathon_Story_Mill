const axios = require('axios');

// Test the new slideshow approach
async function testSlideshow() {
    try {
        console.log('🧪 Testing new slideshow approach...');
        
        const testStory = `
        Once upon a time, there was a magical candy called Rainbow Drops. 
        These colorful candies could grant wishes to anyone who ate them with a pure heart.
        
        A young girl named Emma found a bag of Rainbow Drops in her grandmother's attic.
        When she tasted one, the room filled with beautiful colors and sparkles.
        
        Emma wished for her sick grandmother to feel better.
        The candy glowed brightly, and her grandmother's health was restored.
        
        From that day on, Emma shared the Rainbow Drops with everyone who needed a little magic in their lives.
        `;
        
        const response = await axios.post('http://localhost:3001/api/story/generate-slideshow', {
            storyText: testStory.trim(),
            uploadedImages: null // No uploaded images for this test
        });
        
        if (response.data.success) {
            console.log('✅ Slideshow generation successful!');
            console.log(`📖 Generated ${response.data.presentation.totalScenes} scenes`);
            console.log(`🎭 Story type: ${response.data.presentation.type}`);
            
            // Log first scene details
            if (response.data.presentation.scenes.length > 0) {
                const firstScene = response.data.presentation.scenes[0];
                console.log('\n📝 First scene:');
                console.log(`Text: ${firstScene.text || firstScene.description}`);
                console.log(`Description: ${firstScene.description}`);
                console.log(`Visual Prompt: ${firstScene.visualPrompt?.substring(0, 100)}...`);
                console.log(`Has image: ${!!firstScene.image}`);
                console.log(`Has audio: ${!!firstScene.audio}`);
                console.log(`No ambient sound: ${!firstScene.ambient}`);
            }
        } else {
            console.error('❌ Slideshow generation failed:', response.data.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Test with uploaded images simulation
async function testSlideshowWithImages() {
    try {
        console.log('\n🧪 Testing slideshow with simulated uploaded images...');
        
        const testStory = `
        Introducing the new SuperCandy! This amazing candy comes in three flavors.
        First, we have the strawberry flavor that tastes like summer.
        Next, the chocolate flavor that melts in your mouth.
        Finally, the mint flavor that refreshes your day.
        `;
        
        // Simulate uploaded images (base64 would be real image data)
        const mockImages = [
            {
                base64: 'mock-base64-data-1',
                name: 'candy1.jpg'
            },
            {
                base64: 'mock-base64-data-2', 
                name: 'candy2.jpg'
            }
        ];
        
        const response = await axios.post('http://localhost:3001/api/story/generate-slideshow', {
            storyText: testStory.trim(),
            uploadedImages: mockImages
        });
        
        if (response.data.success) {
            console.log('✅ Slideshow with images generation successful!');
            console.log(`📖 Generated ${response.data.presentation.totalScenes} scenes`);
            console.log(`🖼️ Used uploaded images: ${response.data.presentation.hasUploadedImages}`);
        } else {
            console.error('❌ Slideshow with images generation failed:', response.data.error);
        }
        
    } catch (error) {
        console.error('❌ Test with images failed:', error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting StoryMill slideshow tests...\n');
    
    // Test basic slideshow
    await testSlideshow();
    
    // Test slideshow with images
    await testSlideshowWithImages();
    
    console.log('\n✨ Tests completed!');
}

runTests();