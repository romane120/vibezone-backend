// Import necessary libraries
const express = require('express');
const cors = require('cors');
const fs =require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config(); // Načítanie premenných z .env súboru (pre lokálny vývoj)

// --- Konfigurácia Cloudinary ---
// Tieto hodnoty sa načítajú z Environment Variables na Renderi
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// --- Nastavenie Multer (na spracovanie súborov v pamäti) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET_KEY = 'mysecretkey';

// Middleware
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'db.json');

// Ostatné funkcie (initializeDatabase, readDb, writeDb, adminAuth) zostávajú rovnaké...
function initializeDatabase() {
  if (!fs.existsSync(dbPath)) {
    console.log('db.json not found. Creating it with default data...');
    const defaultDb = { videos: [], comments: [] };
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2));
    console.log('db.json created successfully.');
  }
}
const readDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const writeDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
const adminAuth = (req, res, next) => { /* ... kód pre admina ... */ };


// --- Nový Endpoint na nahrávanie videa ---
app.post('/api/upload', upload.single('videoFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded.' });
    }

    // Nahrávanie videa na Cloudinary z pamäte
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'video' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ message: 'Failed to upload video to Cloudinary.' });
        }

        // Uloženie informácií o videu do našej databázy
        const db = readDb();
        const newVideo = {
          id: db.videos.length > 0 ? Math.max(...db.videos.map(v => v.id)) + 1 : 1,
          title_key: req.body.title || 'Nové video',
          channel: req.body.channel || 'Anonymný kanál',
          video_src: result.secure_url, // URL adresa videa z Cloudinary
          poster_src: result.secure_url.replace('.mp4', '.jpg'), // Jednoduchý plagát
          // Ostatné informácie môžeme nastaviť na predvolené hodnoty
          views_key: "0 videní • práve teraz",
          subs_key: "0 odberateľov",
          desc_key: req.body.description || '',
          thumbnail_src: result.secure_url.replace('.mp4', '.jpg'),
          avatar_src: `https://i.pravatar.cc/48?u=${req.body.channel || 'Anonymous'}`
        };

        db.videos.unshift(newVideo); // Pridanie nového videa na začiatok zoznamu
        writeDb(db);
        
        res.status(201).json({ message: 'Video uploaded successfully!', video: newVideo });
      }
    );

    // Poslanie súboru do Cloudinary streamu
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error('Upload Endpoint Error:', error);
    res.status(500).json({ message: 'Server error during upload.' });
  }
});

// Ostatné API endpoints (GET videí, komentárov, atď.) zostávajú rovnaké...
app.get('/api/videos', (req, res) => {
  try { res.json(readDb().videos); } catch (e) { res.status(500).json({ message: "Error reading videos" }); }
});

// Štart servera
app.listen(PORT, () => {
  initializeDatabase();
  console.log(`Backend server is running on port ${PORT}`);
});
