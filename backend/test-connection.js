#!/usr/bin/env node

/**
 * StoryMill Backend Connection Test
 * Tests if the backend is running and accessible
 */

const axios = require('axios');

const testBackendConnection = async () => {
    console.log('🔍 Testing StoryMill Backend Connection...\n');
    
    const baseURL = 'http://localhost:3001';
    const endpoints = [
        { path: '/api/health', name: 'Health Check' },
        { path: '/api/system/status', name: 'System Status' },
        { path: '/api/story/demo', name: 'Demo Story' }
    ];
    
    console.log(`Testing backend at: ${baseURL}\n`);
    
    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Testing ${endpoint.name}...`);
            const response = await axios.get(`${baseURL}${endpoint.path}`, {
                timeout: 5000
            });
            
            console.log(`✅ ${endpoint.name}: OK (${response.status})`);
            
            if (endpoint.path === '/api/health') {
                const data = response.data;
                console.log(`   Backend: ${data.status}`);
                console.log(`   Version: ${data.version}`);
                console.log(`   APIs: ${Object.entries(data.apis?.status || {})
                    .filter(([_, available]) => available)
                    .map(([name]) => name)
                    .join(', ') || 'none'}`);
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log(`❌ ${endpoint.name}: Backend not running`);
                console.log(`   Start backend with: cd backend && npm run dev`);
            } else if (error.response?.status === 404) {
                console.log(`❌ ${endpoint.name}: Endpoint not found (404)`);
            } else {
                console.log(`❌ ${endpoint.name}: ${error.message}`);
            }
        }
        console.log('');
    }
    
    // Test story generation endpoint specifically
    try {
        console.log('📝 Testing Story Generation Endpoint...');
        const testStory = {
            storyText: "Once upon a time, there was a brave little mouse who lived in a big castle."
        };
        
        const response = await axios.post(`${baseURL}/api/story/generate-complete`, testStory, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Story Generation: Endpoint accessible');
        console.log('   Note: Full generation may require API keys');
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Story Generation: Backend not running');
        } else if (error.response?.status === 404) {
            console.log('❌ Story Generation: Endpoint not found (404)');
            console.log('   Check if /api/story/generate-complete route exists');
        } else if (error.response?.status === 400) {
            console.log('✅ Story Generation: Endpoint accessible (validation working)');
        } else if (error.response?.status === 500) {
            console.log('⚠️  Story Generation: Endpoint accessible but API keys may be missing');
        } else {
            console.log(`❌ Story Generation: ${error.message}`);
        }
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Make sure backend is running: cd backend && npm run dev');
    console.log('2. Check if port 3001 is available');
    console.log('3. Verify API keys in backend/.env file');
    console.log('4. Check frontend VITE_API_URL in frontend/.env');
    console.log('5. Ensure CORS is properly configured');
};

// Run the test
testBackendConnection().catch(console.error);