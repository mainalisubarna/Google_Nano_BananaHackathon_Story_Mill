#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌟 StoryMill Setup Script');
console.log('========================\n');

// Check if we're in the right directory
if (!fs.existsSync('backend') || !fs.existsSync('frontend')) {
    console.error('❌ Please run this script from the StoryMill root directory');
    process.exit(1);
}

// Function to run command and handle errors
const runCommand = (command, description, cwd = process.cwd()) => {
    console.log(`📦 ${description}...`);
    try {
        execSync(command, { cwd, stdio: 'inherit' });
        console.log(`✅ ${description} completed\n`);
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        process.exit(1);
    }
};

// Setup backend
console.log('🔧 Setting up backend...');
runCommand('npm install', 'Installing backend dependencies', './backend');

// Create .env file if it doesn't exist
const envPath = path.join('backend', '.env');
const envExamplePath = path.join('backend', '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('📝 Created .env file from template');
    console.log('⚠️  Please add your API keys to backend/.env\n');
} else if (fs.existsSync(envPath)) {
    console.log('📝 .env file already exists\n');
}

// Setup frontend
console.log('🎨 Setting up frontend...');
runCommand('npm install', 'Installing frontend dependencies', './frontend');

// Create temp directory
const tempDir = path.join('backend', 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('📁 Created temp directory');
}

console.log('🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Add your Gemini API key to backend/.env');
console.log('2. Run "npm run dev" in the backend directory');
console.log('3. Run "npm run dev" in the frontend directory');
console.log('4. Open http://localhost:5173 and click "Try Demo Story"');
console.log('\n🔑 API Keys (optional but recommended):');
console.log('- Gemini API: https://makersuite.google.com/app/apikey (Required)');
console.log('- OpenAI API: https://platform.openai.com/api-keys (For better images/audio)');
console.log('- ElevenLabs: https://elevenlabs.io/app/speech-synthesis (For premium TTS)');
console.log('\n🚀 StoryMill is ready to transform your stories into visual magic!');