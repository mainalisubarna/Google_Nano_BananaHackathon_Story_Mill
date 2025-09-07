#!/usr/bin/env node

/**
 * StoryMill Startup Script
 * Checks configuration and starts both backend and frontend
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const checkFile = (filePath, description) => {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description}: Found`);
        return true;
    } else {
        console.log(`❌ ${description}: Missing`);
        return false;
    }
};

const checkConfiguration = () => {
    console.log('🔍 Checking StoryMill Configuration...\n');
    
    let allGood = true;
    
    // Check backend files
    console.log('📁 Backend Files:');
    allGood &= checkFile('backend/server.js', 'Backend server');
    allGood &= checkFile('backend/package.json', 'Backend package.json');
    allGood &= checkFile('backend/routes/story.js', 'Story routes');
    allGood &= checkFile('backend/services/audioService.js', 'Audio service');
    allGood &= checkFile('backend/services/geminiService.js', 'Gemini service');
    allGood &= checkFile('backend/utils/validation.js', 'Validation utils');
    
    console.log('');
    
    // Check frontend files
    console.log('📁 Frontend Files:');
    allGood &= checkFile('frontend/package.json', 'Frontend package.json');
    allGood &= checkFile('frontend/src/App.jsx', 'Frontend App');
    allGood &= checkFile('frontend/src/services/api.js', 'API service');
    allGood &= checkFile('frontend/.env', 'Frontend environment');
    
    console.log('');
    
    // Check environment files
    console.log('⚙️  Environment Configuration:');
    const backendEnvExists = checkFile('backend/.env', 'Backend .env');
    const frontendEnvExists = checkFile('frontend/.env', 'Frontend .env');
    
    if (backendEnvExists) {
        const envContent = fs.readFileSync('backend/.env', 'utf8');
        const hasGemini = envContent.includes('GEMINI_API_KEY=') && !envContent.includes('GEMINI_API_KEY=your_');
        const hasGoogle = envContent.includes('GOOGLE_CLOUD_API_KEY=') && !envContent.includes('GOOGLE_CLOUD_API_KEY=your_');
        const hasElevenLabs = envContent.includes('ELEVENLABS_API_KEY=') && !envContent.includes('ELEVENLABS_API_KEY=your_');
        
        console.log(`   ${hasGemini ? '✅' : '⚠️ '} Gemini API Key ${hasGemini ? 'configured' : 'missing'}`);
        console.log(`   ${hasGoogle ? '✅' : '⚠️ '} Google Cloud API Key ${hasGoogle ? 'configured' : 'missing'}`);
        console.log(`   ${hasElevenLabs ? '✅' : '⚠️ '} ElevenLabs API Key ${hasElevenLabs ? 'configured' : 'missing'}`);
        
        if (!hasGemini) {
            console.log('   📝 Add GEMINI_API_KEY to backend/.env for image generation');
        }
        if (!hasGoogle && !hasElevenLabs) {
            console.log('   📝 Add at least one audio API key (Google Cloud or ElevenLabs)');
        }
    }
    
    console.log('');
    
    return allGood;
};

const startServices = () => {
    console.log('🚀 Starting StoryMill Services...\n');
    
    // Start backend
    console.log('📡 Starting backend server...');
    const backend = spawn('npm', ['run', 'dev'], {
        cwd: 'backend',
        stdio: 'pipe',
        shell: true
    });
    
    backend.stdout.on('data', (data) => {
        console.log(`[Backend] ${data.toString().trim()}`);
    });
    
    backend.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString().trim()}`);
    });
    
    // Start frontend after a delay
    setTimeout(() => {
        console.log('🎨 Starting frontend server...');
        const frontend = spawn('npm', ['run', 'dev'], {
            cwd: 'frontend',
            stdio: 'pipe',
            shell: true
        });
        
        frontend.stdout.on('data', (data) => {
            console.log(`[Frontend] ${data.toString().trim()}`);
        });
        
        frontend.stderr.on('data', (data) => {
            console.error(`[Frontend Error] ${data.toString().trim()}`);
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down StoryMill...');
            backend.kill();
            frontend.kill();
            process.exit(0);
        });
        
    }, 3000);
    
    console.log('\n📋 Services Status:');
    console.log('   Backend: http://localhost:3001');
    console.log('   Frontend: http://localhost:5173');
    console.log('   Health Check: http://localhost:3001/api/health');
    console.log('\n💡 Press Ctrl+C to stop all services');
};

// Main execution
const main = () => {
    console.log('🌟 StoryMill Startup\n');
    
    const configOk = checkConfiguration();
    
    if (configOk) {
        console.log('✅ Configuration looks good!\n');
        
        // Check if node_modules exist
        const backendModules = fs.existsSync('backend/node_modules');
        const frontendModules = fs.existsSync('frontend/node_modules');
        
        if (!backendModules || !frontendModules) {
            console.log('📦 Installing dependencies...');
            if (!backendModules) {
                console.log('   Installing backend dependencies...');
                // You would run npm install here
            }
            if (!frontendModules) {
                console.log('   Installing frontend dependencies...');
                // You would run npm install here
            }
            console.log('   Run: npm install in both backend/ and frontend/ directories');
            console.log('   Then run this script again.\n');
            return;
        }
        
        startServices();
    } else {
        console.log('❌ Configuration issues found. Please fix them and try again.\n');
        console.log('📚 Setup Instructions:');
        console.log('1. Copy backend/.env.example to backend/.env');
        console.log('2. Add your API keys to backend/.env');
        console.log('3. Run npm install in both backend/ and frontend/');
        console.log('4. Run this script again');
    }
};

main();