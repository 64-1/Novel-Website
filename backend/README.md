# Novel-Website Backend API

Backend API server for 星海小说 (Star Sea Novel) - A novel reading and writing platform.

## 🚀 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Draft Management**: Cloud-based draft storage with auto-save support
- **Chapter Publishing**: Publish drafts as chapters in books
- **Book Management**: Create, update, and manage novel collections
- **Reading Progress**: Sync reading progress across devices
- **Annotations**: Bookmarks and highlights with notes
- **User Preferences**: Sync theme, font settings, and preferences

## 📋 Prerequisites

Before running the backend, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (v6 or higher)
  - Local installation, OR
  - MongoDB Atlas account (free tier available)

## 🛠️ Installation

### 1. Navigate to backend directory

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/novel-website
# For MongoDB Atlas, use:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/novel-website

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h

# CORS Configuration
CLIENT_URL=http://localhost:3000
# For production, use your frontend domain:
# CLIENT_URL=https://yoursite.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ Important**: Change `JWT_SECRET` to a random, secure string in production!

### 4. Start MongoDB

#### Option A: Local MongoDB

```bash
# On macOS (with Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
net start MongoDB
```

#### Option B: MongoDB Atlas

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Add your IP address to whitelist (or use 0.0.0.0/0 for development)
4. Create a database user
5. Get your connection string and update `MONGODB_URI` in `.env`

### 5. Run the server

#### Development mode (with auto-reload)

```bash
npm run dev
```

#### Production mode

```bash
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 🧪 Testing the API

### Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Register a new user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the returned `token` for authenticated requests.

### Create a draft (requires authentication)

```bash
curl -X POST http://localhost:5000/api/drafts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "My First Chapter",
    "tags": ["fantasy", "adventure"],
    "body": "Once upon a time..."
  }'
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| GET | `/auth/me` | Get current user | Yes |
| POST | `/auth/refresh` | Refresh JWT token | Yes |
| POST | `/auth/logout` | Logout (client-side) | Yes |

### User Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get user profile | Yes |
| PUT | `/users/profile` | Update user profile | Yes |
| GET | `/users/preferences` | Get user preferences | Yes |
| PUT | `/users/preferences` | Update user preferences | Yes |
| GET | `/users/:username` | Get public user profile | No |

### Draft Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/drafts` | List all user drafts | Yes |
| POST | `/drafts` | Create new draft | Yes |
| GET | `/drafts/:id` | Get specific draft | Yes |
| PUT | `/drafts/:id` | Update draft | Yes |
| DELETE | `/drafts/:id` | Delete draft | Yes |
| POST | `/drafts/:id/publish` | Publish draft as chapter | Yes |

### Book Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/books` | List all public books | No |
| GET | `/books/search?q=query` | Search books | No |
| GET | `/books/:slug` | Get book by slug | No |
| POST | `/books` | Create new book | Yes |
| PUT | `/books/:id` | Update book | Yes (author only) |
| DELETE | `/books/:id` | Delete book | Yes (author only) |

### Chapter Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/chapters/book/:bookSlug` | Get all chapters for a book | No |
| GET | `/chapters/:slug` | Get chapter by slug | No |
| POST | `/chapters` | Create new chapter | Yes |
| PUT | `/chapters/:id` | Update chapter | Yes (author only) |
| DELETE | `/chapters/:id` | Delete chapter | Yes (author only) |

### Reading Progress Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/progress` | Get all reading progress | Yes |
| GET | `/progress/last-read` | Get last read chapter | Yes |
| GET | `/progress/:chapterSlug` | Get progress for chapter | Yes |
| PUT | `/progress/:chapterSlug` | Update reading progress | Yes |

### Annotation Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/annotations/bookmarks` | Get all bookmarks | Yes |
| POST | `/annotations/bookmarks` | Create bookmark | Yes |
| DELETE | `/annotations/bookmarks/:id` | Delete bookmark | Yes |
| GET | `/annotations/highlights/:chapterSlug` | Get highlights for chapter | Yes |
| POST | `/annotations/highlights` | Create highlight | Yes |
| PUT | `/annotations/highlights/:id` | Update highlight note | Yes |
| DELETE | `/annotations/highlights/:id` | Delete highlight | Yes |

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [] // Optional validation details
  }
}
```

### Error Codes

- `AUTH_FAILED` - Authentication failed
- `UNAUTHORIZED` - Not authorized for this resource
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Input validation failed
- `DUPLICATE_ENTRY` - Duplicate resource (e.g., email exists)
- `SERVER_ERROR` - Internal server error

## 🔒 Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: 24-hour expiration
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: express-validator for all inputs
- **XSS Protection**: Helmet.js security headers
- **CORS**: Configured for specific origins
- **NoSQL Injection Prevention**: Mongoose built-in protection

## 🗄️ Database Models

### User
- username, email, password (hashed)
- displayName, bio, avatar
- preferences (theme, reading settings)
- timestamps

### Draft
- userId (ref: User)
- title, tags, body
- wordCount, metadata
- version control
- timestamps

### Book
- authorId (ref: User)
- title, slug, description
- coverImage, tags, category
- status, visibility
- stats (chapters, views, bookmarks)
- timestamps

### Chapter
- bookId (ref: Book), authorId (ref: User)
- title, slug, body
- chapterNumber, wordCount
- isPublished, publishedAt
- stats (views, readingTime)
- timestamps

### ReadingProgress
- userId, bookId, chapterId
- chapterSlug, percentage, scrollPosition
- lastReadAt
- timestamps

### Annotation
- userId, chapterId, chapterSlug
- type (bookmark | highlight)
- position (for bookmarks)
- selectedText, rangeData, color, note (for highlights)
- timestamps

## 📦 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── jwt.js               # JWT utilities
│   │   └── constants.js         # App constants
│   ├── models/
│   │   ├── User.js
│   │   ├── Draft.js
│   │   ├── Book.js
│   │   ├── Chapter.js
│   │   ├── ReadingProgress.js
│   │   └── Annotation.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── drafts.js
│   │   ├── books.js
│   │   ├── chapters.js
│   │   ├── progress.js
│   │   └── annotations.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── draftController.js
│   │   ├── bookController.js
│   │   ├── chapterController.js
│   │   ├── progressController.js
│   │   └── annotationController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── errorHandler.js      # Error handling
│   │   └── validators.js        # Input validation
│   └── app.js                   # Express app setup
├── server.js                    # Entry point
├── package.json
├── .env.example
└── README.md
```

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/novel-website
JWT_SECRET=use-a-long-random-secure-string-here
JWT_EXPIRE=24h
CLIENT_URL=https://yourproductiondomain.com
```

### Deployment Platforms

#### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set CLIENT_URL=your-client-url
git push heroku main
```

#### Railway
1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically on git push

#### DigitalOcean App Platform
1. Create new app from GitHub
2. Configure environment variables
3. Deploy

#### Self-hosted (with PM2)
```bash
npm install -g pm2
pm2 start server.js --name novel-api
pm2 save
pm2 startup
```

## 🔧 Troubleshooting

### MongoDB Connection Issues

**Problem**: `MongooseServerSelectionError`

**Solution**:
- Check MongoDB is running: `mongod --version`
- Verify connection string in `.env`
- For Atlas: Check IP whitelist and credentials

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find and kill the process using port 5000
lsof -ti:5000 | xargs kill -9

# Or change PORT in .env
```

### JWT Token Issues

**Problem**: "Invalid token" errors

**Solution**:
- Ensure token is passed in header: `Authorization: Bearer <token>`
- Check token hasn't expired (24h default)
- Verify JWT_SECRET matches between token creation and verification

## 📝 Development Tips

### Auto-reload with Nodemon

The `npm run dev` command uses nodemon for auto-reload during development.

### Logging

- Development mode: Detailed HTTP logs with `morgan('dev')`
- Production mode: Combined logs with `morgan('combined')`

### Database GUI Tools

Recommended tools for viewing MongoDB data:
- **MongoDB Compass** (Official GUI)
- **Studio 3T**
- **Robo 3T**

### Testing with Postman/Insomnia

1. Import base URL: `http://localhost:5000/api`
2. Create environment variable for token
3. Set Authorization header: `Bearer {{token}}`

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`

---

**Built with ❤️ for 星海小说 (Star Sea Novel)**
