// models/Watchlist.js - User watchlist and favorites
const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  type: {
    type: String,
    enum: ['favorite', 'watchlist', 'liked'],
    default: 'watchlist'
  },
  rating: {
    type: Number, // User's personal rating 1-5
    min: 1,
    max: 5
  },
  notes: {
    type: String,
    maxlength: 500
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index: one entry per user-movie-type combo
watchlistSchema.index({ user: 1, movie: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
