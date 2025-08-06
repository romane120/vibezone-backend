// Import necessary libraries
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET_KEY = 'mysecretkey';

// Middleware
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'db.json');

// --- Database Initialization ---
function initializeDatabase() {
  if (!fs.existsSync(dbPath)) {
    console.log('db.json not found. Creating it with default data...');
    const defaultDb = {
      videos: [
        {
          "id": 1, "title_key": "Aerial Forest Shots", "views_key": "78k views • 3 days ago", "channel": "NatureLover", "subs_key": "150k subscribers", "desc_key": "A short video capturing the beauty of the forest from a bird's eye view.",
          "video_src": "https://assets.mixkit.co/videos/preview/mixkit-a-drone-flying-over-the-forest-4993-large.mp4",
          "poster_src": "https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          "thumbnail_src": "https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg?auto=compress&cs=tinysrgb&w=168&h=94&dpr=1",
          "avatar_src": "https://i.pravatar.cc/48?u=naturelover"
        },
        {
          "id": 2, "title_key": "Calm River in the Mountains", "views_key": "1.1M views • 2 weeks ago", "channel": "MountainStream", "subs_key": "320k subscribers", "desc_key": "Relaxing footage of a mountain river and surrounding nature.",
          "video_src": "https://assets.mixkit.co/videos/preview/mixkit-calm-river-in-the-mountains-4367-large.mp4",
          "poster_src": "https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
          "thumbnail_src": "https://images.pexels.com/photos/440731/pexels-photo-440731.jpeg?auto=compress&cs=tinysrgb&w=168&h=94&dpr=1",
          "avatar_src": "https://i.pravatar.cc/48?u=mountainstream"
        }
      ],
      comments: [
        { "id": 1, "videoId": 1, "user": "Jane Doe", "avatar": "https://i.pravatar.cc/40?u=JaneDoe", "text": "Amazing shots!", "timestamp": "2025-08-03T10:00:00Z" }
      ]
    };
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2));
    console.log('db.json created successfully.');
  } else {
    console.log('db.json already exists.');
  }
}

// Helper functions
const readDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const writeDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
  if (req.headers['x-admin-secret'] === ADMIN_SECRET_KEY) next();
  else res.status(403).json({ message: 'Forbidden: Admin access only' });
};

// --- API Endpoints ---
app.get('/api/videos', (req, res) => {
  try { res.json(readDb().videos); } catch (e) { res.status(500).json({ message: "Error reading videos", error: e.message }); }
});

app.get('/api/videos/:videoId/comments', (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId, 10);
    res.json(readDb().comments.filter(c => c.videoId === videoId));
  } catch (e) { res.status(500).json({ message: "Error reading comments", error: e.message }); }
});

app.post('/api/videos/:videoId/comments', (req, res) => {
  try {
    const db = readDb();
    const videoId = parseInt(req.params.videoId, 10);
    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ message: "User and text are required." });
    const newComment = {
      id: db.comments.length > 0 ? Math.max(...db.comments.map(c => c.id)) + 1 : 1, videoId, user, text,
      avatar: `https://i.pravatar.cc/40?u=${user.replace(/\s+/g, '')}`,
      timestamp: new Date().toISOString()
    };
    db.comments.push(newComment);
    writeDb(db);
    res.status(201).json(newComment);
  } catch (e) { res.status(500).json({ message: "Error saving comment", error: e.message }); }
});

// Admin routes...
app.get('/api/admin/stats', adminAuth, (req, res) => {
    try {
        const db = readDb();
        res.json({ videoCount: db.videos.length, commentCount: db.comments.length });
    } catch (e) { res.status(500).json({ message: "Error reading stats" }); }
});

app.delete('/api/admin/videos/:videoId', adminAuth, (req, res) => {
    try {
        const db = readDb();
        const videoId = parseInt(req.params.videoId, 10);
        db.videos = db.videos.filter(v => v.id !== videoId);
        db.comments = db.comments.filter(c => c.videoId !== videoId);
        writeDb(db);
        res.status(200).json({ message: 'Video deleted' });
    } catch (e) { res.status(500).json({ message: "Error deleting video" }); }
});

// Start server
app.listen(PORT, () => {
  initializeDatabase();
  console.log(`Backend server is running on port ${PORT}`);
});
