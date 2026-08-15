// models/Movie.js - Movie schema
const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  tmdbId: {
    type: Number,
    unique: true,
    sparse: true // Allow null/undefined
  },
  title: {
    type: String,
    required: [true, 'Movie title is required'],
    trim: true,
    index: true // Index for faster search
  },
  overview: {
    type: String,
    default: 'No description available.'
  },
  genres: {
    type: [String],
    required: true,
    index: true
  },
  language: {
    type: String,
    default: 'English'
  },
  releaseYear: {
    type: Number
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  voteCount: {
    type: Number,
    default: 0
  },
  posterPath: {
    type: String,
    default: ''
  },
  backdropPath: {
    type: String,
    default: ''
  },
  director: {
    type: String,
    default: 'Unknown'
  },
  cast: {
    type: [String],
    default: []
  },
  runtime: {
    type: Number, // in minutes
    default: 0
  },
  popularity: {
    type: Number,
    default: 0
  },
  trending: {
    type: Boolean,
    default: false
  },
  moods: {
    type: [String],
    default: []
  },
  situations: {
    type: [String],
    default: []
  },
  dna: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Text index for search functionality
movieSchema.index({ title: 'text', overview: 'text', director: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
