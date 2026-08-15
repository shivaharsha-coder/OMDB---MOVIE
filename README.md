# 🎬 OMDB - A Movie Recommender

A full-stack movie recommendation web app with JWT authentication, personalized recommendations, watchlist/favorites, genre filtering, and search. Works in **demo mode** even without MongoDB running.

---

## 📁 Project Structure

```
movie-recommender/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── seed.js            # Sample data seeder
│   ├── controllers/
│   │   ├── authController.js  # Register, Login, Profile
│   │   ├── movieController.js # Movies + Recommendations
│   │   └── watchlistController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT protect middleware
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── User.js            # User schema
│   │   ├── Movie.js           # Movie schema
│   │   └── Watchlist.js       # Favorites/Watchlist schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── movies.js
│   │   └── watchlist.js
│   ├── .env                   # Environment variables
│   ├── Dockerfile
│   ├── package.json
│   └── server.js              # Entry point
├── frontend/
│   ├── index.html             # Complete single-file frontend
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── OMDB - A Movie Recommender.json
└── README.md
```

---

## 🚀 Quick Start (3 Options)

### Option A — Frontend Only (No Setup Required)

The frontend works standalone with built-in demo data.

1. Open `frontend/index.html` directly in your browser
2. Click **"Explore Movies"** to browse demo movies
3. Register/Login — auth works in demo mode without a backend

> ✅ All 12 demo movies load, search works, genre filtering works.

---

### Option B — Full Stack (VS Code + Local MongoDB)

#### Prerequisites

- Node.js 18+ → https://nodejs.org
- MongoDB Community → https://www.mongodb.com/try/download/community
- VS Code → https://code.visualstudio.com

#### Step 1 — Clone / Open Project

```bash
cd movie-recommender
```

#### Step 2 — Install Backend Dependencies

```bash
cd backend
npm install
```

#### Step 3 — Configure Environment

Edit `backend/.env` if needed (defaults work out of the box):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/movie_recommender
JWT_SECRET=your_super_secret_jwt_key_change_in_production_2024
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

#### Step 4 — Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Windows — start MongoDB service from Services panel
# or run: "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"

# Linux
sudo systemctl start mongod
```

#### Step 5 — Seed the Database (15 sample movies)

```bash
# From the backend/ directory
npm run seed
```

Expected output:

```
✅ MongoDB Connected: localhost
🗑️  Cleared existing movies
✅ Seeded 15 movies successfully
```

#### Step 6 — Start Backend Server

```bash
npm run dev
```

Expected output:

```
🎬 Movie Recommender API
🚀 Server running on http://localhost:5000
📡 Environment: development
🔗 Health check: http://localhost:5000/api/health
✅ MongoDB Connected: localhost
```

#### Step 7 — Open Frontend

Open `frontend/index.html` in your browser, OR serve it:

```bash
# Simple HTTP server (Python)
cd frontend
python3 -m http.server 3000
# Then visit: http://localhost:3000
```

---

### Option C — Docker (Full Stack, One Command)

#### Prerequisites

- Docker Desktop → https://www.docker.com/products/docker-desktop

#### Run Everything

```bash
cd movie-recommender
docker-compose up --build
```

Then seed the database:

```bash
docker exec movie_backend node config/seed.js
```

#### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

#### Stop

```bash
docker-compose down
# Remove volumes too:
docker-compose down -v
```

---

## 📡 API Reference

### Base URL

```
http://localhost:5000/api
```

### 🔐 Authentication

| Method | Endpoint            | Auth | Description        |
| ------ | ------------------- | ---- | ------------------ |
| POST   | `/auth/register`    | No   | Create account     |
| POST   | `/auth/login`       | No   | Login, returns JWT |
| GET    | `/auth/me`          | JWT  | Get current user   |
| PUT    | `/auth/preferences` | JWT  | Update genre prefs |
| PUT    | `/auth/profile`     | JWT  | Update name/avatar |

**Register Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "preferences": {
    "genres": ["Action", "Drama"],
    "languages": ["English"]
  }
}
```

**Login Response:**

```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "_id": "...", "name": "Jane Doe", "email": "..." }
}
```

**Using JWT:** Add to every protected request:

```
Authorization: Bearer <your_token_here>
```

---

### 🎬 Movies

| Method | Endpoint                  | Auth | Description            |
| ------ | ------------------------- | ---- | ---------------------- |
| GET    | `/movies`                 | No   | All movies (paginated) |
| GET    | `/movies/trending`        | No   | Trending movies        |
| GET    | `/movies/search?q=term`   | No   | Search movies          |
| GET    | `/movies/genres`          | No   | List all genres        |
| GET    | `/movies/recommendations` | JWT  | Personalized picks     |
| GET    | `/movies/:id`             | No   | Single movie detail    |

**Query Parameters for `/movies`:**

```
?page=1         # Page number (default: 1)
?limit=12       # Items per page (default: 12)
?genre=Action   # Filter by genre
?sort=-rating   # Sort field (prefix - for desc)
```

---

### 📋 Watchlist

| Method | Endpoint                             | Auth | Description     |
| ------ | ------------------------------------ | ---- | --------------- |
| GET    | `/watchlist`                         | JWT  | Get user's list |
| GET    | `/watchlist?type=favorite`           | JWT  | Favorites only  |
| POST   | `/watchlist`                         | JWT  | Add movie       |
| GET    | `/watchlist/check/:movieId`          | JWT  | Check if saved  |
| DELETE | `/watchlist/:movieId?type=watchlist` | JWT  | Remove          |

**Add to List Body:**

```json
{
  "movieId": "64abc...",
  "type": "favorite",
  "rating": 5,
  "notes": "All-time favorite!"
}
```

Types: `"favorite"` | `"watchlist"` | `"liked"`

---

## 🧪 Postman Testing

1. Open Postman → **Import** → select `OMDB - A Movie Recommender.json`
2. The collection has a `token` variable that auto-saves on login
3. Run requests in order: Register → Login → Protected routes

**Test Flow:**

```
1. POST /auth/register   → creates user
2. POST /auth/login      → token auto-saved to collection variable
3. GET  /auth/me         → verify token works
4. GET  /movies          → browse movies
5. GET  /movies/search?q=nolan → search
6. POST /watchlist       → add a movie (copy _id from step 4)
7. GET  /watchlist       → see your list
8. GET  /movies/recommendations → personalized picks
```

---

## 🧠 Recommendation Algorithm

Located in `backend/controllers/movieController.js` → `getRecommendations`:

```
1. Fetch user's saved preferences (genres)
2. Find movies matching ANY preferred genre
3. Exclude movies already in watchlist
4. Sort by rating + popularity
5. If < 6 results: fill with top-rated movies
6. Apply language filter if specified (doesn't reduce below 4)
```

This is **content-based filtering** — simple, transparent, and effective for cold-start scenarios.

---

## 🏗️ Architecture

```
Client (Browser)
    │
    ▼
frontend/index.html (Vanilla JS SPA)
    │  REST API calls
    ▼
Express.js Server (port 5000)
    ├── /api/auth     → authController
    ├── /api/movies   → movieController
    └── /api/watchlist → watchlistController
         │
         ▼
    Mongoose ODM
         │
         ▼
    MongoDB (port 27017)
```

**MVC Pattern:**

- **Models** — Mongoose schemas (User, Movie, Watchlist)
- **Views** — Frontend HTML/JS (separate from backend)
- **Controllers** — Business logic (auth, movies, watchlist)
- **Routes** — URL → Controller mapping
- **Middleware** — JWT auth, error handling

---

## 🔒 Security

- Passwords hashed with **bcryptjs** (12 salt rounds)
- **JWT** tokens expire in 7 days
- Passwords excluded from all DB queries by default (`select: false`)
- CORS restricted to frontend origin
- Mongoose validation on all inputs
- Global error handler prevents stack trace leaks in production

---

## 🎨 Frontend Features

| Feature             | Implementation                          |
| ------------------- | --------------------------------------- |
| Auth                | JWT stored in localStorage              |
| Demo mode           | Works without backend using MOCK_MOVIES |
| Search              | Debounced (400ms) regex search          |
| Genre filter        | Dynamic from `/movies/genres` endpoint  |
| Movie cards         | Hover actions (favorite/watchlist)      |
| Movie modal         | Backdrop image, cast, full details      |
| Toast notifications | Auto-dismiss after 3s                   |
| Skeleton loading    | Shimmer animation placeholders          |
| Responsive          | Mobile-first CSS Grid + Flexbox         |
| Animations          | CSS keyframes, transitions              |

---

## 🐛 Troubleshooting

**MongoDB connection fails:**

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# If not, start it:
sudo systemctl start mongod    # Linux
brew services start mongodb-community  # macOS
```

**Port already in use:**

```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

**CORS errors in browser:**

- Ensure `FRONTEND_URL` in `.env` matches your frontend URL exactly
- Check that backend is running on port 5000

**Movies not showing:**

- Run `npm run seed` to populate the database
- Check backend console for MongoDB connection status

**JWT errors:**

- Clear localStorage: `localStorage.clear()` in browser console
- Re-login to get a fresh token

---

## 📦 Available Scripts

```bash
# Backend
npm run dev      # Development with nodemon (auto-restart)
npm start        # Production
npm run seed     # Seed database with 15 sample movies

# Docker
docker-compose up --build    # Build and start all services
docker-compose up -d         # Run in background
docker-compose logs backend  # View backend logs
docker-compose down          # Stop all services
```

---

## 🔮 Extending the Project

**Add TMDB live data:**

1. Get free API key at https://www.themoviedb.org/settings/api
2. Add `TMDB_API_KEY=your_key` to `.env`
3. Create `controllers/tmdbController.js` to fetch from TMDB
4. Replace seed data with live trending movies

**Add user ratings:**

```javascript
// Extend Watchlist model
rating: { type: Number, min: 1, max: 5 }
// Then use ratings in recommendation scoring
```

**Add collaborative filtering:**

- Find users with similar genre preferences
- Recommend movies liked by similar users
- Weight by cosine similarity of genre vectors
