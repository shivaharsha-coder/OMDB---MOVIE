// routes/movies.js - Movie routes
const express = require('express');
const router = express.Router();
const {
  getMovies,
  getTrending,
  searchMovies,
  getRecommendations,
  getMovieById,
  getGenres
} = require('../controllers/movieController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', getMovies);
router.get('/trending', getTrending);
router.get('/search', searchMovies);
router.get('/genres', getGenres);

// Protected routes
router.get('/recommendations', protect, getRecommendations);

// Must be last to avoid conflicts with named routes above
router.get('/:id', getMovieById);

module.exports = router;
