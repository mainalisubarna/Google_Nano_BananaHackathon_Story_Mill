const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        process.env.FRONTEND_URL || false : 
        ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Import routes - Only story and video routes are needed for main functionality
const storyRoutes = require('./routes/story');
const videoRoutes = require('./routes/video');

// Use routes
app.use('/api/story', storyRoutes);
app.use('/api/video', videoRoutes);

// Health check with comprehensive API status
app.get('/api/health', (req, res) => {
    const { validateAPIKeys } = require('./utils/validation');
    const apiValidation = validateAPIKeys();
    
    const systemInfo = {
        status: 'StoryMill backend is running!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        apis: apiValidation,
        features: {
            textToStory: true,
            audioToStory: apiValidation.status.elevenlabs || apiValidation.status.googleCloud,
            imageGeneration: apiValidation.status.gemini,
            imageEditing: apiValidation.status.gemini,
            voiceSynthesis: apiValidation.status.elevenlabs,
            ambientSounds: apiValidation.status.elevenlabs,
            videoGeneration: true,
            contextAwareTransitions: true,
            parallelProcessing: true
        },
        videoSettings: {
            fps: 60,
            resolution: '1920x1080',
            format: 'mp4',
            maxScenes: 6,
            minScenes: 3,
            transitions: ['fade', 'dissolve', 'wipe', 'slide', 'circle', 'fadeblack', 'fadewhite'],
            contextAware: true
        },
        performance: {
            parallelAudioGeneration: true,
            audioMixing: true,
            tempFileCleanup: true,
            memoryOptimized: true
        }
    };
    
    res.json(systemInfo);
});

// Comprehensive system status endpoint
app.get('/api/system/status', async (req, res) => {
    try {
        const { validateAPIKeys } = require('./utils/validation');
        const apiValidation = validateAPIKeys();
        
        // Check temp directory status
        const tempStats = (() => {
            try {
                const files = fs.readdirSync(tempDir);
                const totalSize = files.reduce((size, file) => {
                    if (file !== '.gitkeep') {
                        const filePath = path.join(tempDir, file);
                        const stats = fs.statSync(filePath);
                        return size + stats.size;
                    }
                    return size;
                }, 0);
                
                return {
                    fileCount: files.filter(f => f !== '.gitkeep').length,
                    totalSize: totalSize,
                    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
                };
            } catch (error) {
                return { error: error.message };
            }
        })();
        
        const systemStatus = {
            timestamp: new Date().toISOString(),
            backend: {
                name: 'StoryMill',
                version: '1.0.0',
                status: 'operational',
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development'
            },
            memory: {
                used: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                total: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
                external: (process.memoryUsage().external / 1024 / 1024).toFixed(2) + ' MB'
            },
            apis: apiValidation,
            storage: {
                tempDirectory: tempDir,
                tempFiles: tempStats
            },
            capabilities: {
                storyGeneration: {
                    textInput: true,
                    audioInput: apiValidation.status.elevenlabs || apiValidation.status.googleCloud,
                    maxLength: '10000 characters',
                    languages: apiValidation.status.elevenlabs ? 'Multi-language' : 'English'
                },
                imageGeneration: {
                    enabled: apiValidation.status.gemini,
                    characterConsistency: true,
                    naturalLanguageEditing: true,
                    styles: 'All artistic styles supported'
                },
                audioGeneration: {
                    narration: apiValidation.status.elevenlabs,
                    ambientSounds: apiValidation.status.elevenlabs,
                    parallelProcessing: true,
                    audioMixing: true
                },
                videoGeneration: {
                    enabled: true,
                    fps: 60,
                    resolution: '1920x1080',
                    format: 'MP4',
                    contextAwareTransitions: true,
                    maxDuration: '5 minutes'
                }
            },
            performance: {
                parallelProcessing: true,
                contextAwareTransitions: true,
                audioMixing: true,
                memoryOptimization: true,
                tempFileCleanup: true,
                averageProcessingTime: '2-4 minutes per story'
            }
        };
        
        res.json(systemStatus);
    } catch (error) {
        console.error('System status error:', error);
        res.status(500).json({
            error: 'Failed to get system status',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Debug endpoint to list all available routes
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    
    // Get all registered routes
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const basePath = middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/');
                    routes.push({
                        path: basePath + handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    
    res.json({
        message: 'Available API endpoints',
        routes: routes,
        timestamp: new Date().toISOString()
    });
});

// 404 handler with better debugging info
app.use('*', (req, res) => {
    console.log(`❌ 404 Error: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        suggestion: 'Check /api/debug/routes for available endpoints',
        availableEndpoints: [
            'GET /api/health',
            'GET /api/system/status',
            'GET /api/system/metrics',
            'POST /api/story/generate-complete',
            'POST /api/story/analyze',
            'GET /api/story/demo',
            'GET /api/story/status',
            'GET /api/video/download/:id',
            'GET /api/video/stream/:id'
        ]
    });
});

// Cleanup temp files on startup
const cleanupTempFiles = () => {
    try {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
            if (file !== '.gitkeep') {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                const now = Date.now();
                const fileAge = now - stats.mtime.getTime();
                
                // Delete files older than 1 hour
                if (fileAge > 60 * 60 * 1000) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up old temp file: ${file}`);
                }
            }
        });
    } catch (error) {
        console.warn('Error cleaning temp files:', error.message);
    }
};

// Performance monitoring
let performanceMetrics = {
    totalRequests: 0,
    successfulStories: 0,
    failedStories: 0,
    averageProcessingTime: 0,
    processingTimes: []
};

// Performance tracking middleware
app.use('/api/story/generate-complete', (req, res, next) => {
    req.startTime = Date.now();
    performanceMetrics.totalRequests++;
    
    const originalSend = res.send;
    res.send = function(data) {
        const processingTime = Date.now() - req.startTime;
        
        if (res.statusCode === 200) {
            performanceMetrics.successfulStories++;
            performanceMetrics.processingTimes.push(processingTime);
            
            // Keep only last 100 processing times
            if (performanceMetrics.processingTimes.length > 100) {
                performanceMetrics.processingTimes.shift();
            }
            
            // Calculate average
            performanceMetrics.averageProcessingTime = 
                performanceMetrics.processingTimes.reduce((a, b) => a + b, 0) / 
                performanceMetrics.processingTimes.length;
        } else {
            performanceMetrics.failedStories++;
        }
        
        console.log(`📊 Story generation completed in ${(processingTime / 1000).toFixed(2)}s`);
        originalSend.call(this, data);
    };
    
    next();
});

// Performance metrics endpoint
app.get('/api/system/metrics', (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        requests: {
            total: performanceMetrics.totalRequests,
            successful: performanceMetrics.successfulStories,
            failed: performanceMetrics.failedStories,
            successRate: performanceMetrics.totalRequests > 0 ? 
                ((performanceMetrics.successfulStories / performanceMetrics.totalRequests) * 100).toFixed(2) + '%' : 
                '0%'
        },
        performance: {
            averageProcessingTime: (performanceMetrics.averageProcessingTime / 1000).toFixed(2) + 's',
            recentProcessingTimes: performanceMetrics.processingTimes.slice(-10).map(t => (t / 1000).toFixed(2) + 's'),
            fastestTime: performanceMetrics.processingTimes.length > 0 ? 
                (Math.min(...performanceMetrics.processingTimes) / 1000).toFixed(2) + 's' : 'N/A',
            slowestTime: performanceMetrics.processingTimes.length > 0 ? 
                (Math.max(...performanceMetrics.processingTimes) / 1000).toFixed(2) + 's' : 'N/A'
        },
        system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version
        }
    };
    
    res.json(metrics);
});

// Start server
app.listen(PORT, () => {
    console.log(`🌟 StoryMill backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 System status: http://localhost:${PORT}/api/system/status`);
    console.log(`📈 Performance metrics: http://localhost:${PORT}/api/system/metrics`);
    console.log(`🔑 API Keys configured: ${Object.entries({
        gemini: !!process.env.GEMINI_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        googleCloud: !!process.env.GOOGLE_CLOUD_API_KEY
    }).filter(([_, hasKey]) => hasKey).map(([name]) => name).join(', ') || 'none'}`);
    
    console.log(`🎬 Video Settings: 60fps, 1920x1080, MP4 format with context-aware transitions`);
    console.log(`⚡ Performance: Parallel processing, audio mixing, memory optimization enabled`);
    
    // Clean up old temp files
    cleanupTempFiles();
    
    // Set up periodic cleanup
    setInterval(cleanupTempFiles, 30 * 60 * 1000); // Every 30 minutes
});
