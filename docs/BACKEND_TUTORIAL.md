# Backend Tutorial: Complete Guide to Using the Novel-Website API

This tutorial will teach you how to use the backend API with hands-on examples. By the end, you'll understand how to authenticate users, manage drafts, publish content, and integrate with your frontend.

## 📚 Table of Contents

1. [Setup and First Run](#1-setup-and-first-run)
2. [Understanding Authentication](#2-understanding-authentication)
3. [Making Your First API Calls](#3-making-your-first-api-calls)
4. [Common Workflows](#4-common-workflows)
5. [Frontend Integration](#5-frontend-integration)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Setup and First Run

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs all required packages:
- `express` - Web server framework
- `mongoose` - MongoDB database
- `jsonwebtoken` - Authentication tokens
- `bcryptjs` - Password encryption
- And more...

### Step 2: Set Up MongoDB

**Option A: Use MongoDB Atlas (Easiest - Free Cloud Database)**

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas/database)
2. Click "Try Free" and create an account
3. Create a **free cluster** (M0 tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

**Option B: Install MongoDB Locally**

```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb

# Windows
# Download from mongodb.com/try/download/community
# Run MongoDB as a service
```

### Step 3: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env file
nano .env  # or use your favorite editor
```

**Minimum required configuration:**

```env
NODE_ENV=development
PORT=5000

# For MongoDB Atlas:
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster.mongodb.net/novel-website

# For local MongoDB:
# MONGODB_URI=mongodb://localhost:27017/novel-website

JWT_SECRET=my-super-secret-key-change-this-to-something-random
JWT_EXPIRE=24h

CLIENT_URL=http://localhost:3000
```

**⚠️ Important:** Change `JWT_SECRET` to a random string! Example:
```bash
# Generate a random secret (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Start the Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# Production mode
npm start
```

**You should see:**
```
✅ MongoDB Connected: cluster0-shard-00-00.mongodb.net
🚀 Server running in development mode on port 5000
📚 Novel-Website API is ready
```

### Step 5: Test the Server

Open another terminal and run:

```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

✅ **Your backend is now running!**

---

## 2. Understanding Authentication

The backend uses **JWT (JSON Web Tokens)** for authentication. Here's how it works:

### The Authentication Flow

```
1. User registers → Backend creates account & returns JWT token
2. User logs in → Backend verifies password & returns JWT token
3. User makes requests → Include token in Authorization header
4. Backend verifies token → Allows/denies access
```

### What is a JWT Token?

A JWT token looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1YTZiM2M4ZDU2NzIzNGI1YzhkZWY5MCIsImlhdCI6MTcwNTMyMDAwMCwiZXhwIjoxNzA1NDA2NDAwfQ.kF3YmQ8X9P4mH_z0LqK7Vj2N8pRwQ9x5lT4uY6bC0eA
```

It contains:
- **Header**: Token type and algorithm
- **Payload**: User ID and expiration time
- **Signature**: Verifies the token hasn't been tampered with

### How to Use Tokens in Requests

**Without authentication (public endpoints):**
```bash
curl http://localhost:5000/api/books
```

**With authentication (protected endpoints):**
```bash
curl http://localhost:5000/api/drafts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

The token is sent in the `Authorization` header with the format: `Bearer <token>`

---

## 3. Making Your First API Calls

Let's walk through a complete user journey with real examples.

### Example 1: Register a New User

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepass123",
    "displayName": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "65a6b3c8d567234b5c8def90",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "bio": null,
      "avatar": null,
      "role": "user",
      "preferences": {
        "theme": "light",
        "readingTheme": "晨光",
        "fontSize": 18,
        "lineHeight": 1.8,
        "musicVolume": 50
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**💾 Save the token!** You'll need it for authenticated requests.

```bash
# Save to variable (Linux/Mac)
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Or save to file
echo "YOUR_TOKEN" > token.txt
```

### Example 2: Login (if you already have an account)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### Example 3: Get Your Profile

**Request:**
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65a6b3c8d567234b5c8def90",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      ...
    }
  }
}
```

### Example 4: Update Your Profile

**Request:**
```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John The Author",
    "bio": "I write fantasy novels and love cats 🐱",
    "avatar": "https://i.pravatar.cc/150?img=12"
  }'
```

### Example 5: Update Preferences

**Request:**
```bash
curl -X PUT http://localhost:5000/api/users/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "dark",
    "readingTheme": "星夜",
    "fontSize": 20,
    "lineHeight": 2.0,
    "musicVolume": 75
  }'
```

---

## 4. Common Workflows

### Workflow A: Writing a Novel (Draft → Publish)

**Step 1: Create a Draft**

```bash
curl -X POST http://localhost:5000/api/drafts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chapter 1: The Beginning",
    "tags": ["fantasy", "adventure"],
    "body": "In a world where magic was forgotten, a young girl discovered an ancient tome..."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "draft": {
      "id": "65a6b4d8e678345c6d9ef01",
      "title": "Chapter 1: The Beginning",
      "tags": ["fantasy", "adventure"],
      "body": "In a world where magic was forgotten...",
      "wordCount": 15,
      "version": 1,
      "lastSavedAt": "2024-01-15T10:35:00.000Z",
      ...
    }
  }
}
```

**💾 Save the draft ID:** `65a6b4d8e678345c6d9ef01`

**Step 2: Update the Draft (Auto-save)**

```bash
curl -X PUT http://localhost:5000/api/drafts/65a6b4d8e678345c6d9ef01 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "In a world where magic was forgotten, a young girl discovered an ancient tome. The book glowed with ethereal light, whispering secrets of a bygone era. She knew her life would never be the same..."
  }'
```

The backend automatically:
- ✅ Calculates word count (Chinese + English)
- ✅ Increments version number
- ✅ Updates timestamp
- ✅ Estimates reading time

**Step 3: List All Your Drafts**

```bash
curl http://localhost:5000/api/drafts \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "id": "65a6b4d8e678345c6d9ef01",
        "title": "Chapter 1: The Beginning",
        "preview": "In a world where magic was forgotten, a young girl discovered an ancient tome. The book...",
        "wordCount": 35,
        "isPublished": false,
        "lastSavedAt": "2024-01-15T10:40:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

**Step 4: Create a Book (to publish chapters into)**

```bash
curl -X POST http://localhost:5000/api/books \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Forgotten Magic",
    "slug": "forgotten-magic",
    "description": "A epic fantasy tale of a girl who rediscovers lost magic",
    "tags": ["fantasy", "magic", "adventure"],
    "category": "Fantasy",
    "visibility": "public",
    "status": "ongoing"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "book": {
      "id": "65a6b5e9f789456d7e0fg12",
      "title": "The Forgotten Magic",
      "slug": "forgotten-magic",
      ...
    }
  }
}
```

**💾 Save the book ID:** `65a6b5e9f789456d7e0fg12`

**Step 5: Publish Draft as Chapter**

```bash
curl -X POST http://localhost:5000/api/drafts/65a6b4d8e678345c6d9ef01/publish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "65a6b5e9f789456d7e0fg12",
    "chapterNumber": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chapter": {
      "id": "65a6b6fag890567e8f1gh23",
      "title": "Chapter 1: The Beginning",
      "slug": "chapter-1-the-beginning-1",
      "chapterNumber": 1,
      "wordCount": 35,
      "isPublished": true,
      "publishedAt": "2024-01-15T10:45:00.000Z"
    },
    "draft": {
      "id": "65a6b4d8e678345c6d9ef01",
      "isPublished": true,
      "publishedAsChapterId": "65a6b6fag890567e8f1gh23"
    }
  }
}
```

**✅ Your chapter is now published!**

### Workflow B: Reading Experience

**Step 1: Browse Public Books**

```bash
curl http://localhost:5000/api/books
```

**Step 2: View a Specific Book**

```bash
curl http://localhost:5000/api/books/forgotten-magic
```

**Step 3: Get All Chapters for a Book**

```bash
curl http://localhost:5000/api/chapters/book/forgotten-magic
```

**Step 4: Read a Chapter**

```bash
curl http://localhost:5000/api/chapters/chapter-1-the-beginning-1
```

**Step 5: Save Reading Progress (requires auth)**

```bash
curl -X PUT http://localhost:5000/api/progress/chapter-1-the-beginning-1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "65a6b5e9f789456d7e0fg12",
    "chapterId": "65a6b6fag890567e8f1gh23",
    "percentage": 45,
    "scrollPosition": 2340
  }'
```

**Step 6: Get Last Read Chapter**

```bash
curl http://localhost:5000/api/progress/last-read \
  -H "Authorization: Bearer $TOKEN"
```

### Workflow C: Annotations (Bookmarks & Highlights)

**Create a Bookmark**

```bash
curl -X POST http://localhost:5000/api/annotations/bookmarks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "65a6b6fag890567e8f1gh23",
    "chapterSlug": "chapter-1-the-beginning-1",
    "type": "bookmark",
    "position": 1234
  }'
```

**Create a Highlight**

```bash
curl -X POST http://localhost:5000/api/annotations/highlights \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chapterId": "65a6b6fag890567e8f1gh23",
    "chapterSlug": "chapter-1-the-beginning-1",
    "type": "highlight",
    "selectedText": "The book glowed with ethereal light",
    "color": "yellow",
    "note": "Beautiful imagery!",
    "rangeData": { "start": 45, "end": 78 }
  }'
```

**Get All Highlights for a Chapter**

```bash
curl http://localhost:5000/api/annotations/highlights/chapter-1-the-beginning-1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Frontend Integration

Now let's integrate the backend with your existing frontend!

### Step 1: Create an API Service

Create `/js/services/ApiService.js`:

```javascript
/**
 * API Service for Novel-Website Backend
 */

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Get authentication headers
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.auth !== false)
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Authentication methods
   */
  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      auth: false
    });

    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false
    });

    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async getMe() {
    return await this.request('/auth/me');
  }

  /**
   * Draft methods
   */
  async getDrafts() {
    return await this.request('/drafts');
  }

  async getDraft(id) {
    return await this.request(`/drafts/${id}`);
  }

  async createDraft(draftData) {
    return await this.request('/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData)
    });
  }

  async updateDraft(id, draftData) {
    return await this.request(`/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(draftData)
    });
  }

  async deleteDraft(id) {
    return await this.request(`/drafts/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Book methods
   */
  async getBooks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/books${query ? '?' + query : ''}`, {
      auth: false
    });
  }

  async getBook(slug) {
    return await this.request(`/books/${slug}`, { auth: false });
  }

  /**
   * Chapter methods
   */
  async getChaptersByBook(bookSlug) {
    return await this.request(`/chapters/book/${bookSlug}`, {
      auth: false
    });
  }

  async getChapter(slug) {
    return await this.request(`/chapters/${slug}`, { auth: false });
  }

  /**
   * Progress methods
   */
  async updateProgress(chapterSlug, progressData) {
    return await this.request(`/progress/${chapterSlug}`, {
      method: 'PUT',
      body: JSON.stringify(progressData)
    });
  }

  async getLastRead() {
    return await this.request('/progress/last-read');
  }

  /**
   * Annotation methods
   */
  async createBookmark(bookmarkData) {
    return await this.request('/annotations/bookmarks', {
      method: 'POST',
      body: JSON.stringify(bookmarkData)
    });
  }

  async getHighlights(chapterSlug) {
    return await this.request(`/annotations/highlights/${chapterSlug}`);
  }

  async createHighlight(highlightData) {
    return await this.request('/annotations/highlights', {
      method: 'POST',
      body: JSON.stringify(highlightData)
    });
  }

  /**
   * User preferences
   */
  async updatePreferences(preferences) {
    return await this.request('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  }
}

export default new ApiService();
```

### Step 2: Update WriterDraftManager

Modify `/js/app/initApp/WriterDraftManager.js` to use the API:

```javascript
import ApiService from '../../services/ApiService.js';

// Replace localStorage save with API call
async function saveDraft() {
  const snapshot = {
    title: titleField.value || '无标题草稿',
    tags: tagsField.value.split(',').map(t => t.trim()).filter(Boolean),
    body: bodyField.value || ''
  };

  try {
    // Save to backend instead of localStorage
    if (currentDraftId) {
      await ApiService.updateDraft(currentDraftId, snapshot);
    } else {
      const result = await ApiService.createDraft(snapshot);
      currentDraftId = result.draft.id;
    }

    updateSaveStatus('saved');
  } catch (error) {
    console.error('Failed to save draft:', error);
    updateSaveStatus('failed');

    // Fallback to localStorage if API fails
    DraftStore.save(snapshot);
  }
}

// Load draft from backend on init
async function loadDraft() {
  try {
    const drafts = await ApiService.getDrafts();
    if (drafts.drafts && drafts.drafts.length > 0) {
      const latest = drafts.drafts[0];
      titleField.value = latest.title;
      tagsField.value = latest.tags.join(', ');
      bodyField.value = latest.body;
      currentDraftId = latest.id;
    }
  } catch (error) {
    console.error('Failed to load draft:', error);
    // Fallback to localStorage
    const draft = DraftStore.load();
    if (draft) {
      titleField.value = draft.title || '';
      tagsField.value = draft.tags || '';
      bodyField.value = draft.body || '';
    }
  }
}
```

### Step 3: Add Login/Register UI

Create a simple login modal in `/write/index.html`:

```html
<!-- Add before closing </body> -->
<div id="auth-modal" class="modal hidden">
  <div class="modal-content">
    <h2>Login or Register</h2>

    <div id="login-form">
      <input type="email" id="login-email" placeholder="Email">
      <input type="password" id="login-password" placeholder="Password">
      <button onclick="handleLogin()">Login</button>
    </div>

    <div id="register-form">
      <input type="text" id="register-username" placeholder="Username">
      <input type="email" id="register-email" placeholder="Email">
      <input type="password" id="register-password" placeholder="Password">
      <button onclick="handleRegister()">Register</button>
    </div>
  </div>
</div>

<script type="module">
import ApiService from '../js/services/ApiService.js';

window.handleLogin = async function() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const result = await ApiService.login(email, password);
    console.log('Logged in as:', result.user.username);
    document.getElementById('auth-modal').classList.add('hidden');
    location.reload(); // Refresh to load user's drafts
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
};

window.handleRegister = async function() {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const result = await ApiService.register({
      username,
      email,
      password,
      displayName: username
    });
    console.log('Registered as:', result.user.username);
    document.getElementById('auth-modal').classList.add('hidden');
    location.reload();
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
};
</script>
```

### Step 4: Sync Reading Progress

Update `ProgressTracker.js`:

```javascript
import ApiService from '../services/ApiService.js';

async function updateProgress(chapterSlug, percentage, scrollPosition) {
  try {
    await ApiService.updateProgress(chapterSlug, {
      bookId: currentBookId,
      chapterId: currentChapterId,
      percentage,
      scrollPosition
    });
  } catch (error) {
    console.error('Failed to sync progress:', error);
  }
}
```

---

## 6. Troubleshooting

### Common Errors and Solutions

#### Error: "MongooseServerSelectionError"

**Problem:** Can't connect to MongoDB

**Solutions:**
1. Check MongoDB is running: `brew services list` (Mac) or `sudo systemctl status mongod` (Linux)
2. Verify `MONGODB_URI` in `.env` is correct
3. For Atlas: Check IP whitelist includes your IP

#### Error: "Invalid token" or "Token expired"

**Problem:** JWT token is invalid or expired (24h default)

**Solutions:**
1. Login again to get a new token
2. Check you're sending the correct format: `Authorization: Bearer <token>`
3. Verify `JWT_SECRET` in `.env` matches the one used to create the token

#### Error: "Port 5000 already in use"

**Problem:** Another process is using port 5000

**Solutions:**
```bash
# Find and kill the process
lsof -ti:5000 | xargs kill -9

# Or change port in .env
PORT=5001
```

#### Error: "CORS error" in browser

**Problem:** Frontend and backend on different origins

**Solution:** Update `CLIENT_URL` in `.env`:
```env
CLIENT_URL=http://localhost:3000
# Or your frontend's actual URL
```

#### Error: "Validation failed"

**Problem:** Missing required fields or invalid data format

**Solution:** Check the error response for details:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address"
      }
    ]
  }
}
```

### Debugging Tips

**1. Check server logs**

The terminal running `npm run dev` shows all requests and errors.

**2. Use verbose curl**

```bash
curl -v http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**3. Test in browser console**

```javascript
// Open browser console (F12) on your frontend
const response = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
const data = await response.json();
console.log(data);
```

**4. Check MongoDB data**

Using MongoDB Compass or CLI:
```bash
mongosh
use novel-website
db.users.find().pretty()
db.drafts.find().pretty()
```

---

## 🎉 Congratulations!

You now know how to:
- ✅ Set up and run the backend
- ✅ Authenticate users with JWT
- ✅ Make API requests with curl
- ✅ Manage drafts, books, and chapters
- ✅ Track reading progress
- ✅ Create bookmarks and highlights
- ✅ Integrate with your frontend
- ✅ Debug common issues

## 📚 Next Steps

1. **Practice:** Try all the curl examples above
2. **Experiment:** Create multiple users, drafts, and books
3. **Integrate:** Connect your existing frontend to the API
4. **Deploy:** Host on Heroku, Railway, or DigitalOcean
5. **Extend:** Add features like comments, follows, or search

## 🔗 Additional Resources

- **Postman Collection:** Import API endpoints for easier testing
- **API Reference:** `/backend/README.md` has complete endpoint list
- **Architecture Docs:** `/docs/BACKEND_ARCHITECTURE.md` explains database design
- **MongoDB Docs:** [docs.mongodb.com](https://docs.mongodb.com/)
- **Express Guide:** [expressjs.com/en/guide](https://expressjs.com/en/guide/routing.html)

---

**Questions?** Check the troubleshooting section or review the code comments in the backend files!
