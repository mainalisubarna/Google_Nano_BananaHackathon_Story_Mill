const express = require('express');
const router = express.Router();
const { getVideoFile } = require('../services/videoService');

/**
 * GET /api/video/download/:videoId
 * Download generated MP4 video
 */
router.get('/download/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        if (!videoId) {
            return res.status(400).json({ error: 'Video ID is required' });
        }

        const videoFile = getVideoFile(videoId);
        
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${videoFile.filename}"`);
        res.setHeader('Content-Length', videoFile.size);
        
        const fs = require('fs');
        const stream = fs.createReadStream(videoFile.path);
        stream.pipe(res);
        
    } catch (error) {
        console.error('Video download error:', error);
        res.status(404).json({ 
            error: 'Video not found',
            details: error.message 
        });
    }
});

/**
 * GET /api/video/stream/:videoId
 * Stream MP4 video for preview
 */
router.get('/stream/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        if (!videoId) {
            return res.status(400).json({ error: 'Video ID is required' });
        }

        const videoFile = getVideoFile(videoId);
        const fs = require('fs');
        
        const stat = fs.statSync(videoFile.path);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            // Support range requests for video streaming
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const stream = fs.createReadStream(videoFile.path, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            });
            
            stream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            });
            
            fs.createReadStream(videoFile.path).pipe(res);
        }
        
    } catch (error) {
        console.error('Video streaming error:', error);
        res.status(404).json({ 
            error: 'Video not found',
            details: error.message 
        });
    }
});

module.exports = router;