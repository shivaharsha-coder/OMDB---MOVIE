// controllers/watchlistController.js - Watchlist and favorites management
const Watchlist = require('../models/Watchlist');
const Movie = require('../models/Movie');

// @desc    Get user's watchlist / favorites
// @route   GET /api/watchlist
// @access  Private
const getWatchlist = async (req, res, next) => {
  try {
    const { type } = req.query; // filter by 'favorite', 'watchlist', 'liked'
    
    const query = { user: req.user._id };
    if (type) query.type = type;

    const items = await Watchlist.find(query)
      .populate('movie')
      .sort('-addedAt');

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add movie to watchlist / favorites
// @route   POST /api/watchlist
// @access  Private
const addToWatchlist = async (req, res, next) => {
  try {
    const { movieId, type = 'watchlist', rating, notes } = req.body;

    // Verify movie exists
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Upsert: create or update
    const item = await Watchlist.findOneAndUpdate(
      { user: req.user._id, movie: movieId, type },
      { rating, notes, addedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await item.populate('movie');

    res.status(201).json({
      success: true,
      message: `Added to ${type}!`,
      item
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Movie already in your list'
      });
    }
    next(error);
  }
};

// @desc    Remove movie from watchlist
// @route   DELETE /api/watchlist/:movieId
// @access  Private
const removeFromWatchlist = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    const query = { user: req.user._id, movie: req.params.movieId };
    if (type) query.type = type;

    const item = await Watchlist.findOneAndDelete(query);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in your list'
      });
    }

    res.json({
      success: true,
      message: 'Removed from list'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if movie is in watchlist
// @route   GET /api/watchlist/check/:movieId
// @access  Private
const checkWatchlist = async (req, res, next) => {
  try {
    const items = await Watchlist.find({
      user: req.user._id,
      movie: req.params.movieId
    });

    const status = {
      inWatchlist: items.some(i => i.type === 'watchlist'),
      inFavorites: items.some(i => i.type === 'favorite'),
      isLiked: items.some(i => i.type === 'liked')
    };

    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist, checkWatchlist };
