// controllers/movieController.js - Movie fetching and recommendation logic
const Movie = require('../models/Movie');
const User = require('../models/User');
const Watchlist = require('../models/Watchlist');
const https = require('https');

// Helper to fetch from OMDb using https module
const fetchOmdb = (queryStr, req = null) => {
  const customKey = req && req.headers ? req.headers['x-omdb-key'] : null;
  const apiKey = customKey || process.env.OMDB_API_KEY || '5ad1e514';
  const baseUrl = process.env.OMDB_BASE_URL || 'https://www.omdbapi.com/';
  const url = `${baseUrl}?apikey=${apiKey}&${queryStr}`;
  
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
};

// Helper to normalise and save an OMDb movie to our database
const normaliseAndSaveMovie = async (omdbData) => {
  if (!omdbData || omdbData.Response === 'False') return null;

  const title = omdbData.Title;
  const imdbID = omdbData.imdbID;
  if (!title || !imdbID) return null;

  try {
    // Check if already exists to avoid duplication
    let movie = await Movie.findOne({ imdbID });
    if (movie) return movie;

    const rating = parseFloat(omdbData.imdbRating) || 0;
    const genres = omdbData.Genre
      ? omdbData.Genre.split(',').map(g => g.trim()).filter(Boolean)
      : [];
    const cast = omdbData.Actors
      ? omdbData.Actors.split(',').map(a => a.trim()).filter(a => a !== 'N/A')
      : [];
    const year = parseInt(omdbData.Year) || null;
    const runtime = parseInt((omdbData.Runtime || '').replace(' min', '')) || 0;
    const voteCount = parseInt((omdbData.imdbVotes || '0').replace(/,/g, '')) || 0;

    // Professional placeholder for empty/unavailable poster URLs
    const posterPath = (omdbData.Poster && omdbData.Poster !== 'N/A') 
      ? omdbData.Poster 
      : '';

    movie = new Movie({
      imdbID,
      title,
      overview: omdbData.Plot !== 'N/A' ? omdbData.Plot : 'No description available.',
      genres,
      language: omdbData.Language ? omdbData.Language.split(',')[0].trim() : 'English',
      releaseYear: year,
      rating,
      voteCount,
      posterPath,
      backdropPath: '',
      director: omdbData.Director !== 'N/A' ? omdbData.Director : 'Unknown',
      cast,
      runtime,
      popularity: rating * 10,
      trending: false
    });

    await movie.save();
    return movie;
  } catch (err) {
    console.error(`Error saving movie ${title}:`, err);
    return null;
  }
};

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

// @desc    Search movies by title (live proxy with local cache)
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

    // Call OMDb API search endpoint
    console.log(`[Search] Query: "${q}", Page: ${page}`);
    const queryStr = `s=${encodeURIComponent(q.trim())}&type=movie&page=${page}`;
    const searchData = await fetchOmdb(queryStr, req);
    console.log(`[Search] OMDb API search response:`, searchData);

    let movies = [];
    if (searchData && searchData.Response === 'True' && searchData.Search) {
      // Fetch full details and save/cache each movie
      movies = await Promise.all(
        searchData.Search.slice(0, parseInt(limit)).map(async (item) => {
          try {
            // First check if already in db
            let dbMovie = await Movie.findOne({ imdbID: item.imdbID });
            if (dbMovie) return dbMovie;

            // Fetch details and save
            const detailData = await fetchOmdb(`i=${item.imdbID}&plot=full`, req);
            return await normaliseAndSaveMovie(detailData);
          } catch (_) {
            return null;
          }
        })
      );
      movies = movies.filter(Boolean);
    }

    // Fallback: If OMDb fails, search the local database using regex as a backup
    if (movies.length === 0) {
      const searchRegex = new RegExp(q.trim(), 'i');
      movies = await Movie.find({
        $or: [
          { title: searchRegex },
          { director: searchRegex },
          { cast: searchRegex }
        ]
      }).limit(parseInt(limit));
    }

    res.json({
      success: true,
      query: q,
      count: movies.length,
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

// @desc    Get single movie by DB ID
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

    res.json({ success: true, movie });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single movie by IMDB ID
// @route   GET /api/movies/by-imdb/:imdbId
// @access  Public
const getMovieByImdbId = async (req, res, next) => {
  try {
    const { imdbId } = req.params;
    
    // Check database
    let movie = await Movie.findOne({ imdbID: imdbId });
    if (movie) {
      return res.json({ success: true, movie });
    }

    // Fetch from OMDb
    const detailData = await fetchOmdb(`i=${imdbId}&plot=full`, req);
    movie = await normaliseAndSaveMovie(detailData);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    res.json({ success: true, movie });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single movie by Title
// @route   GET /api/movies/by-title
// @access  Public
const getMovieByTitle = async (req, res, next) => {
  try {
    const { title } = req.query;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Check database
    let movie = await Movie.findOne({ title: new RegExp(`^${title.trim()}$`, 'i') });
    if (movie) {
      return res.json({ success: true, movie });
    }

    // Fetch from OMDb
    const detailData = await fetchOmdb(`t=${encodeURIComponent(title.trim())}&plot=full`, req);
    movie = await normaliseAndSaveMovie(detailData);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
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
  getMovieByImdbId,
  getMovieByTitle,
  getGenres
};
