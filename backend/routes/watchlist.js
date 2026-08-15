// routes/watchlist.js - Watchlist routes (all protected)
const express = require('express');
const router = express.Router();
const { getWatchlist, addToWatchlist, removeFromWatchlist, checkWatchlist } = require('../controllers/watchlistController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getWatchlist);
router.post('/', addToWatchlist);
router.get('/check/:movieId', checkWatchlist);
router.delete('/:movieId', removeFromWatchlist);

module.exports = router;
