// server.js - Main Express server entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // ✅ ADDED

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Connect to MongoDB ────────────────────────────────────
connectDB();

// ─── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ ADDED: Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API Routes ────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/watchlist', require('./routes/watchlist'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Movie Recommender API is running'
  });
});

// ✅ ADDED: Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});