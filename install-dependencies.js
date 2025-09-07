#!/usr/bin/env node

/**
 * StoryMill Dependency Installation Script
 * Installs all required dependencies for both backend and frontend
 */

const { spawn } = require('child_process');
const fs = require('fs');

const runCommand = (command, args, cwd) => {
    return new Promise((resolve, reject) => {
        console.log(`📦 Running: ${command} ${args.join(' ')} in ${cwd}`);
        
        const process = spawn(command, args, {
            cwd,
            stdio: 'inherit',
            shell: true
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
};

const installDependencies = async () => {
    console.log('🚀 StoryMill Dependency Installation\n');
    
    try {
        // Check if directories exist
        if (!fs.existsSync('backend')) {
            console.log('❌ Backend directory not found');
            return;
        }
        
        if (!fs.existsSync('frontend')) {
            console.log('❌ Frontend directory not found');
            return;
        }
        
        // Install backend dependencies
        console.log('📡 Installing backend dependencies...');
        await runCommand('npm', ['install'], 'backend');
        
        // Install the new Google GenAI package specifically
        console.log('🎨 Installing Google GenAI package...');
        await runCommand('npm', ['install', '@google/genai@latest'], 'backend');
        
        console.log('✅ Backend dependencies installed successfully!\n');
        
        // Install frontend dependencies
        console.log('🎨 Installing frontend dependencies...');
        await runCommand('npm', ['install'], 'frontend');
        
        console.log('✅ Frontend dependencies installed successfully!\n');
        
        // Test the installation
        console.log('🧪 Testing installations...');
        
        // Test backend
        console.log('📡 Testing backend dependencies...');
        await runCommand('npm', ['run', 'test-services'], 'backend');
        
        console.log('\n🌟 Installation Complete!');
        console.log('\n📋 Next Steps:');
        console.log('1. Configure API keys in backend/.env');
        console.log('2. Start backend: cd backend && npm run dev');
        console.log('3. Start frontend: cd frontend && npm run dev');
        console.log('4. Test image generation: cd backend && npm run test-images');
        
    } catch (error) {
        console.error('❌ Installation failed:', error.message);
        console.log('\n🔧 Manual Installation:');
        console.log('Backend: cd backend && npm install && npm install @google/genai@latest');
        console.log('Frontend: cd frontend && npm install');
    }
};

// Run the installation
installDependencies();