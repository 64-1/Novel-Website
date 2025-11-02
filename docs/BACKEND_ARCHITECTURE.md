# Backend Architecture Design

## Overview

This document outlines the backend architecture for the Novel-Website (星海小说) platform, enabling user authentication, cloud-based draft storage, and content publishing capabilities.

## Technology Stack

### Backend Framework
- **Node.js** (v18+) - JavaScript runtime
- **Express.js** (v4.18+) - Web application framework
- **MongoDB** (v6+) - NoSQL database for flexible document storage
- **Mongoose** (v8+) - MongoDB ODM for schema validation

### Authentication & Security
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting for API protection

### Development Tools
- **nodemon** - Auto-restart during development
- **dotenv** - Environment variable management
- **morgan** - HTTP request logging

## Architecture Design

### Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── jwt.js               # JWT configuration
│   │   └── constants.js         # App-wide constants
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Draft.js             # Draft schema
│   │   ├── Chapter.js           # Published chapter schema
│   │   └── Book.js              # Book/novel schema
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management routes
│   │   ├── drafts.js            # Draft CRUD routes
│   │   ├── chapters.js          # Chapter publishing routes
│   │   └── books.js             # Book catalog routes
│   ├── controllers/
│   │   ├── authController.js    # Auth logic
│   │   ├── userController.js    # User logic
│   │   ├── draftController.js   # Draft logic
│   │   └── chapterController.js # Chapter logic
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── errorHandler.js      # Error handling
│   │   └── validators.js        # Input validation
│   ├── services/
│   │   ├── authService.js       # Authentication business logic
│   │   └── emailService.js      # Email notifications (future)
│   └── app.js                   # Express app setup
├── server.js                    # Entry point
├── package.json
├── .env.example                 # Environment variables template
└── README.md                    # Backend setup instructions
```

## Database Schema

### User Model

```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  displayName: String,
  bio: String,
  avatar: String (URL),
  preferences: {
    theme: String,              // 'light' | 'dark'
    readingTheme: String,       // '晨光' | '暮色' | '星夜'
    fontSize: Number,
    lineHeight: Number,
    musicVolume: Number
  },
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

### Draft Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  title: String,
  tags: [String],
  body: String,
  wordCount: Number,
  metadata: {
    characterCount: Number,
    estimatedReadTime: Number  // in minutes
  },
  version: Number,             // Version control
  isPublished: Boolean,
  publishedAsChapterId: ObjectId (ref: 'Chapter'),
  createdAt: Date,
  updatedAt: Date,
  lastSavedAt: Date
}
```

### Book Model

```javascript
{
  _id: ObjectId,
  authorId: ObjectId (ref: 'User'),
  title: String (required),
  slug: String (unique, indexed),
  description: String,
  coverImage: String (URL),
  tags: [String],
  category: String,
  status: String,              // 'ongoing' | 'completed' | 'hiatus'
  visibility: String,          // 'public' | 'private' | 'unlisted'
  stats: {
    totalChapters: Number,
    totalWordCount: Number,
    viewCount: Number,
    bookmarkCount: Number
  },
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}
```

### Chapter Model

```javascript
{
  _id: ObjectId,
  bookId: ObjectId (ref: 'Book'),
  authorId: ObjectId (ref: 'User'),
  title: String (required),
  slug: String (indexed),
  body: String (required),
  chapterNumber: Number,
  wordCount: Number,
  isPublished: Boolean,
  publishedAt: Date,
  stats: {
    viewCount: Number,
    readingTime: Number        // average in seconds
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Reading Progress Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  bookId: ObjectId (ref: 'Book'),
  chapterId: ObjectId (ref: 'Chapter'),
  chapterSlug: String,
  percentage: Number,          // 0-100
  scrollPosition: Number,
  lastReadAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Annotation Model (Bookmarks & Highlights)

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  chapterId: ObjectId (ref: 'Chapter'),
  chapterSlug: String,
  type: String,                // 'bookmark' | 'highlight'

  // For bookmarks
  position: Number,

  // For highlights
  selectedText: String,
  rangeData: Object,           // Selection range data
  color: String,               // Highlight color
  note: String,                // User note

  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Create new user account | No |
| POST | `/login` | Login and receive JWT token | No |
| POST | `/logout` | Logout (client-side token removal) | Yes |
| GET | `/me` | Get current user profile | Yes |
| POST | `/refresh` | Refresh JWT token | Yes |

### User Routes (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |
| PUT | `/preferences` | Update user preferences | Yes |
| GET | `/preferences` | Get user preferences | Yes |

### Draft Routes (`/api/drafts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List all user drafts | Yes |
| POST | `/` | Create new draft | Yes |
| GET | `/:id` | Get specific draft | Yes |
| PUT | `/:id` | Update draft (auto-save) | Yes |
| DELETE | `/:id` | Delete draft | Yes |
| POST | `/:id/publish` | Publish draft as chapter | Yes |

### Chapter Routes (`/api/chapters`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List all public chapters | No |
| GET | `/:slug` | Get chapter by slug | No |
| POST | `/` | Create new chapter | Yes |
| PUT | `/:id` | Update chapter | Yes (author only) |
| DELETE | `/:id` | Delete chapter | Yes (author only) |
| GET | `/book/:bookSlug` | Get all chapters for a book | No |

### Book Routes (`/api/books`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | List all public books | No |
| GET | `/:slug` | Get book by slug | No |
| POST | `/` | Create new book | Yes |
| PUT | `/:id` | Update book | Yes (author only) |
| DELETE | `/:id` | Delete book | Yes (author only) |
| GET | `/search` | Search books | No |

### Reading Progress Routes (`/api/progress`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all reading progress | Yes |
| GET | `/:chapterSlug` | Get progress for chapter | Yes |
| PUT | `/:chapterSlug` | Update reading progress | Yes |
| GET | `/last-read` | Get last read chapter | Yes |

### Annotation Routes (`/api/annotations`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/bookmarks` | Get all bookmarks | Yes |
| POST | `/bookmarks` | Create bookmark | Yes |
| DELETE | `/bookmarks/:id` | Delete bookmark | Yes |
| GET | `/highlights/:chapterSlug` | Get highlights for chapter | Yes |
| POST | `/highlights` | Create highlight | Yes |
| PUT | `/highlights/:id` | Update highlight note | Yes |
| DELETE | `/highlights/:id` | Delete highlight | Yes |

## Authentication Flow

### Registration
1. User submits username, email, password
2. Backend validates input
3. Password is hashed with bcrypt (10 rounds)
4. User document created in database
5. JWT token generated and returned
6. Frontend stores token in localStorage
7. User redirected to dashboard

### Login
1. User submits email/username + password
2. Backend finds user by email/username
3. Password verified with bcrypt.compare()
4. JWT token generated (24h expiry)
5. Token returned to client
6. Frontend stores in localStorage
7. Subsequent requests include token in Authorization header

### Protected Routes
1. Client sends request with `Authorization: Bearer <token>` header
2. Middleware verifies JWT token
3. If valid, user ID extracted and attached to `req.user`
4. Route handler executes with authenticated user context
5. If invalid, 401 Unauthorized returned

## Data Migration Strategy

### localStorage to Backend Migration

```javascript
// Migration service pseudocode
function migrateLocalDataToBackend(authToken) {
  // 1. Read localStorage data
  const draft = localStorage.getItem('novel:draft');
  const settings = localStorage.getItem('novel:reader-settings');
  const progress = getAllProgressFromLocalStorage();
  const bookmarks = localStorage.getItem('novel:ann:bookmarks:v1');
  const highlights = localStorage.getItem('novel:ann:highlights:v1');

  // 2. Upload to backend
  if (draft) {
    await api.post('/api/drafts', JSON.parse(draft), { headers: { Authorization: `Bearer ${authToken}` } });
  }

  if (settings) {
    await api.put('/api/users/preferences', JSON.parse(settings), { headers: { Authorization: `Bearer ${authToken}` } });
  }

  // 3. Migrate progress, bookmarks, highlights
  // ...

  // 4. Clear localStorage after successful migration
  localStorage.removeItem('novel:draft');
  // Set migration flag
  localStorage.setItem('novel:migrated', 'true');
}
```

## Security Considerations

### Password Security
- Passwords hashed with bcrypt (10+ rounds)
- Minimum password length: 8 characters
- No password storage in logs or error messages

### JWT Security
- Tokens expire after 24 hours
- Refresh token mechanism for seamless UX
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Secret key stored in environment variables

### API Security
- Rate limiting (100 requests per 15 minutes per IP)
- Input validation on all endpoints
- XSS protection with helmet.js
- CORS configured for specific origins
- SQL/NoSQL injection prevention with Mongoose

### Data Privacy
- Users can only access their own drafts/data
- Author-only access to edit/delete published content
- Public content accessible without authentication

## Deployment Considerations

### Environment Variables
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/novel-website
JWT_SECRET=<random-secure-string>
JWT_EXPIRE=24h
CLIENT_URL=https://yoursite.com
```

### Production Checklist
- [ ] Use MongoDB Atlas for managed database
- [ ] Enable database backups
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure proper CORS origins
- [ ] Use HTTPS only
- [ ] Enable rate limiting
- [ ] Set up logging infrastructure
- [ ] Configure process manager (PM2)
- [ ] Set up health check endpoint
- [ ] Enable compression middleware

## Future Enhancements

### Phase 1 (Current Implementation)
- [x] User authentication
- [x] Draft management
- [x] Basic chapter publishing
- [x] Reading progress sync

### Phase 2
- [ ] Social features (follow authors, comments)
- [ ] Email notifications
- [ ] Advanced search (Elasticsearch)
- [ ] Analytics dashboard for authors
- [ ] Chapter versioning/history

### Phase 3
- [ ] Real-time collaboration (WebSocket)
- [ ] Content recommendation engine
- [ ] Payment integration for premium content
- [ ] Mobile app (React Native)
- [ ] Multi-language support

## Performance Optimization

### Database Indexing
```javascript
// User model indexes
username: { unique: true, index: true }
email: { unique: true, index: true }

// Book model indexes
slug: { unique: true, index: true }
authorId: { index: true }
tags: { index: true }
createdAt: { index: -1 }

// Chapter model indexes
bookId: { index: true }
slug: { index: true }
chapterNumber: { index: 1 }

// Compound indexes
{ bookId: 1, chapterNumber: 1 }
{ authorId: 1, createdAt: -1 }
```

### Caching Strategy
- Use Redis for session storage (future)
- Cache frequently accessed books/chapters
- Implement ETags for chapter content
- Service worker caching for static assets (already implemented)

### API Response Optimization
- Pagination for list endpoints (default: 20 items per page)
- Field filtering (`?fields=title,author,createdAt`)
- Response compression (gzip)
- Lazy loading for large text content

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
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

## Monitoring & Logging

### Logging Strategy
- HTTP request logs (morgan)
- Error logs (separate file)
- Authentication events
- Database query performance
- API response times

### Metrics to Track
- API endpoint response times
- Database query performance
- Authentication success/failure rates
- User registration/login trends
- Draft save frequency
- Chapter publish rates

---

## Summary

This architecture provides a solid foundation for adding backend capabilities to the Novel-Website platform. It maintains the excellent frontend structure while adding:

✅ **User Accounts** - Secure authentication with JWT
✅ **Cloud Storage** - Drafts and settings synced across devices
✅ **Publishing** - Authors can publish and manage content
✅ **Analytics** - Track reading progress and user engagement
✅ **Scalability** - MongoDB and Express.js scale horizontally
✅ **Security** - Industry-standard security practices

The modular design allows for incremental implementation and easy future enhancements.
