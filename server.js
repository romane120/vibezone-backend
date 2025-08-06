// Import necessary libraries
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// --- Kontrola kľúčov pri štarte ---
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('!!!!!! ZÁVAŽNÁ CHYBA: Chýbajú Cloudinary kľúče. Skontrolujte Environment Variables na Renderi.');
}

// --- Konfigurácia Cloudinary ---
cloudinary.config({ 
  cloud_name: CLOUDINARY_CLOUD_NAME, 
  api_key: CLOUDINARY_API_KEY, 
  api_secret: CLOUDINARY_API_SECRET 
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'db.json');

// --- Funkcie pre databázu ---
function initializeDatabase() {
  if (!fs.existsSync(dbPath)) {
    console.log('db.json not found. Creating it with default data...');
    const defaultDb = {
      videos: [
        { "id": 1, "title_key": "Aerial Forest Shots", "views_key": "78k views • 3 days ago", "channel": "NatureLover", "subs_key": "150k subscribers", "desc_key": "A short video capturing the beauty of the forest.", "video_src": "https://assets.mixkit.co/videos/preview/mixkit-a-drone-flying-over-the-forest-4993-large.mp4", "poster_src": "https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", "thumbnail_src": "https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg?auto=compress&cs=tinysrgb&w=168&h=94&dpr=1", "avatar_src": "https://i.pravatar.cc/48?u=naturelover" }
      ],
      comments: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2));
  }
}
const readDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const writeDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- Endpoint na nahrávanie videa ---
app.post('/api/upload', upload.single('videoFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded.' });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'video' },
      (error, result) => {
        if (error) {
          console.error('!!!!!! CHYBA PRI NAHRÁVANÍ NA CLOUDINARY:', JSON.stringify(error, null, 2));
          return res.status(500).json({ message: 'Failed to upload video to Cloudinary. Check API keys.' });
        }

        const db = readDb();
        const newVideo = {
          id: db.videos.length > 0 ? Math.max(...db.videos.map(v => v.id)) + 1 : 1,
          title_key: req.body.title || 'Nové video',
          channel: req.body.channel || 'Anonymný kanál',
          video_src: result.secure_url,
          poster_src: result.secure_url.replace(/\.mp4$/, '.jpg'),
          views_key: "0 videní • práve teraz",
          subs_key: "0 odberateľov",
          desc_key: req.body.description || '',
          thumbnail_src: result.secure_url.replace(/\.mp4$/, '.jpg'),
          avatar_src: `https://i.pravatar.cc/48?u=${req.body.channel || 'Anonymous'}`
        };

        db.videos.unshift(newVideo);
        writeDb(db);
        
        res.status(201).json({ message: 'Video uploaded successfully!', video: newVideo });
      }
    );

    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error('Upload Endpoint Error:', error);
    res.status(500).json({ message: 'Server error during upload.' });
  }
});

// Ostatné API endpoints...
app.get('/api/videos', (req, res) => {
  try { res.json(readDb().videos); } catch (e) { res.status(500).json({ message: "Error reading videos" }); }
});

// Štart servera
app.listen(PORT, () => {
  initializeDatabase();
  console.log(`Backend server is running on port ${PORT}`);
});
