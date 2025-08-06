// Import necessary libraries
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = 3000; // Port the server will run on
const ADMIN_SECRET_KEY = 'mysecretkey'; // Secret key for admin access

// Middleware
app.use(cors()); // Allows communication between frontend and backend
app.use(express.json()); // Allows the server to receive data in JSON format

const dbPath = path.join(__dirname, 'db.json');

// Helper functions for DB operations
const readDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const writeDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// Middleware for admin authentication
const adminAuth = (req, res, next) => {
  if (req.headers['x-admin-secret'] === ADMIN_SECRET_KEY) {
    next(); // Key is correct, proceed
  } else {
    res.status(403).json({ message: 'Forbidden: Admin access only' });
  }
};


// --- Public API Endpoints ---

// Get all videos
app.get('/api/videos', (req, res) => {
  try {
    res.json(readDb().videos);
  } catch (error) {
    res.status(500).json({ message: "Error reading videos data" });
  }
});

// Get comments for a specific video
app.get('/api/videos/:videoId/comments', (req, res) => {
  try {
    const db = readDb();
    const videoId = parseInt(req.params.videoId, 10);
    res.json(db.comments.filter(c => c.videoId === videoId));
  } catch (error) {
    res.status(500).json({ message: "Error reading comments data" });
  }
});

// Add a new comment
app.post('/api/videos/:videoId/comments', (req, res) => {
  try {
    const db = readDb();
    const videoId = parseInt(req.params.videoId, 10);
    const { user, text } = req.body;

    if (!user || !text) {
      return res.status(400).json({ message: "User and text are required." });
    }

    const newComment = {
      id: db.comments.length > 0 ? Math.max(...db.comments.map(c => c.id)) + 1 : 1,
      videoId: videoId,
      user: user,
      avatar: `https://i.pravatar.cc/40?u=${user.replace(/\s+/g, '')}`,
      text: text,
      timestamp: new Date().toISOString()
    };

    db.comments.push(newComment);
    writeDb(db);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Error saving comment" });
  }
});


// --- Admin API Endpoints (protected) ---

// Get all comments (for admin)
app.get('/api/admin/comments', adminAuth, (req, res) => {
    try {
        res.json(readDb().comments);
    } catch (error) {
        res.status(500).json({ message: "Error reading comments data" });
    }
});

// Get statistics (for admin)
app.get('/api/admin/stats', adminAuth, (req, res) => {
    try {
        const db = readDb();
        res.json({
            videoCount: db.videos.length,
            commentCount: db.comments.length
        });
    } catch (error) {
        res.status(500).json({ message: "Error reading stats" });
    }
});

// Delete a video (for admin)
app.delete('/api/admin/videos/:videoId', adminAuth, (req, res) => {
    try {
        const db = readDb();
        const videoId = parseInt(req.params.videoId, 10);
        
        const videosFiltered = db.videos.filter(v => v.id !== videoId);
        if (videosFiltered.length === db.videos.length) {
            return res.status(404).json({ message: 'Video not found' });
        }
        db.videos = videosFiltered;

        db.comments = db.comments.filter(c => c.videoId !== videoId);

        writeDb(db);
        res.status(200).json({ message: 'Video and associated comments deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: "Error deleting video" });
    }
});

// Delete a comment (for admin)
app.delete('/api/admin/comments/:commentId', adminAuth, (req, res) => {
    try {
        const db = readDb();
        const commentId = parseInt(req.params.commentId, 10);
        
        const commentsFiltered = db.comments.filter(c => c.id !== commentId);
        if (commentsFiltered.length === db.comments.length) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        db.comments = commentsFiltered;
        
        writeDb(db);
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: "Error deleting comment" });
    }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});


