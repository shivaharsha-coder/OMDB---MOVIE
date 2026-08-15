// controllers/movieController.js - Movie fetching and recommendation logic
const Movie = require('../models/Movie');
const User = require('../models/User');
const Watchlist = require('../models/Watchlist');

// @desc    Get all movies (with filters)
// @route   GET /api/movies
// @access  Public
const getMovies = async (req, res, next) => {
  try {
    const { genre, language, mood, situation, dna, sort = '-rating', page = 1, limit = 12 } = req.query;
    
    const query = {};
    if (genre) query.genres = genre;
    if (language && language !== 'All') query.language = new RegExp(language, 'i');
    if (mood) query.moods = mood;
    if (situation) query.situations = situation;
    if (dna) {
      const dnaList = dna.split(',').map(d => d.trim()).filter(Boolean);
      if (dnaList.length > 0) {
        query.dna = { $all: dnaList }; // Require all specified DNA tags
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movies, total] = await Promise.all([
      Movie.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Movie.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: movies.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      movies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get trending movies
// @route   GET /api/movies/trending
// @access  Public
const getTrending = async (req, res, next) => {
  try {
    const movies = await Movie.find({ trending: true })
      .sort('-popularity')
      .limit(10);

    res.json({ success: true, movies });
  } catch (error) {
    next(error);
  }
};

// @desc    Search movies by title
// @route   GET /api/movies/search?q=query
// @access  Public
const searchMovies = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use regex for flexible partial matching
    const searchRegex = new RegExp(q.trim(), 'i');
    const query = {
      $or: [
        { title: searchRegex },
        { director: searchRegex },
        { cast: searchRegex },
        { overview: searchRegex }
      ]
    };

    const [movies, total] = await Promise.all([
      Movie.find(query).skip(skip).limit(parseInt(limit)),
      Movie.countDocuments(query)
    ]);

    res.json({
      success: true,
      query: q,
      count: movies.length,
      total,
      movies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get personalized recommendations based on user preferences
// @route   GET /api/movies/recommendations
// @access  Private
const getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { genres, languages } = user.preferences;

    // Get movies already in watchlist to exclude
    const watchlistItems = await Watchlist.find({ user: req.user._id }).select('movie');
    const watchlistedIds = watchlistItems.map(w => w.movie);

    let recommendations = [];

    // 1. If user has genre preferences, find matching movies
    if (genres && genres.length > 0) {
      recommendations = await Movie.find({
        genres: { $in: genres },
        _id: { $nin: watchlistedIds }
      })
        .sort('-rating -popularity')
        .limit(12);
    }

    // 2. If not enough recommendations, fill with top-rated
    if (recommendations.length < 6) {
      const extraMovies = await Movie.find({
        _id: { $nin: [...watchlistedIds, ...recommendations.map(m => m._id)] }
      })
        .sort('-rating')
        .limit(12 - recommendations.length);
      
      recommendations = [...recommendations, ...extraMovies];
    }

    // 3. Filter by language preference if set
    if (languages && languages.length > 0 && !languages.includes('All')) {
      const langFiltered = recommendations.filter(m => languages.includes(m.language));
      // Only use language filter if it doesn't reduce results too much
      if (langFiltered.length >= 4) {
        recommendations = langFiltered;
      }
    }

    res.json({
      success: true,
      count: recommendations.length,
      based_on: genres.length > 0 ? genres : ['top rated'],
      movies: recommendations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single movie by ID
// @route   GET /api/movies/:id
// @access  Public
const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Track recently viewed if user is logged in
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          recentlyViewed: {
            $each: [{ movie: movie._id, viewedAt: new Date() }],
            $slice: -20, // Keep only last 20
            $position: 0
          }
        }
      });
    }

    res.json({ success: true, movie });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available genres list
// @route   GET /api/movies/genres
// @access  Public
const getGenres = async (req, res, next) => {
  try {
    const genres = await Movie.distinct('genres');
    res.json({ success: true, genres: genres.sort() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMovies,
  getTrending,
  searchMovies,
  getRecommendations,
  getMovieById,
  getGenres
};
