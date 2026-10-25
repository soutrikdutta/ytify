require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// 1. YouTube Music Home Feed (Mirrored 1:1)
app.get('/api/ytmusic/home', (req, res) => {
  const pythonScript = path.join(__dirname, 'get_ytmusic_home.py');
  const pythonProcess = spawn('python', [pythonScript]);

  let output = '';
  let err = '';

  pythonProcess.stdout.on('data', (d) => { output += d.toString(); });
  pythonProcess.stderr.on('data', (d) => { err += d.toString(); });

  pythonProcess.on('close', () => {
    try {
      const data = JSON.parse(output.trim());
      res.json(data);
    } catch (parseErr) {
      console.warn('Error parsing ytmusic home:', err);
      res.json({ sections: [] });
    }
  });
});

// 2. YouTube Music Moods / Categories (Podcasts, Romance, Feel good, Workout...)
app.get('/api/ytmusic/mood', (req, res) => {
  const mood = req.query.category || 'All';
  const pythonScript = path.join(__dirname, 'get_mood_feed.py');
  const pythonProcess = spawn('python', [pythonScript, mood]);

  let output = '';
  let err = '';

  pythonProcess.stdout.on('data', (d) => { output += d.toString(); });
  pythonProcess.stderr.on('data', (d) => { err += d.toString(); });

  pythonProcess.on('close', () => {
    try {
      const data = JSON.parse(output.trim());
      res.json(data);
    } catch (parseErr) {
      console.warn('Error parsing mood feed:', err);
      res.json({ title: mood, items: [] });
    }
  });
});

// 3. Audio Stream Resolver via yt-dlp
app.get('/api/stream/:videoId', (req, res) => {
  const { videoId } = req.params;
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pythonProcess = spawn('python', ['-m', 'yt_dlp', '-g', '-f', 'bestaudio', youtubeUrl]);

  let audioUrl = '';
  let errorOutput = '';

  pythonProcess.stdout.on('data', (data) => { audioUrl += data.toString(); });
  pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

  pythonProcess.on('close', () => {
    const cleanUrl = audioUrl.trim().split('\n').filter(line => line.startsWith('http'))[0];
    if (cleanUrl) {
      res.json({ audioUrl: cleanUrl });
    } else {
      res.status(500).json({ error: 'Direct audio stream unavailable' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`ytify Complete Mirror Backend running on http://localhost:${PORT}`);
});
