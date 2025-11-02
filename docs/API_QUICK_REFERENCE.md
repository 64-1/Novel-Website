# API Quick Reference

A cheat sheet for the most commonly used endpoints.

## 🔑 Authentication

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 📝 Drafts

```bash
# Create draft
curl -X POST http://localhost:5000/api/drafts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Chapter","body":"Content here..."}'

# List drafts
curl http://localhost:5000/api/drafts \
  -H "Authorization: Bearer $TOKEN"

# Get specific draft
curl http://localhost:5000/api/drafts/DRAFT_ID \
  -H "Authorization: Bearer $TOKEN"

# Update draft (auto-save)
curl -X PUT http://localhost:5000/api/drafts/DRAFT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Updated content..."}'

# Delete draft
curl -X DELETE http://localhost:5000/api/drafts/DRAFT_ID \
  -H "Authorization: Bearer $TOKEN"
```

## 📚 Books

```bash
# Browse public books
curl http://localhost:5000/api/books

# Search books
curl "http://localhost:5000/api/books/search?q=fantasy"

# Get book details
curl http://localhost:5000/api/books/book-slug

# Create book
curl -X POST http://localhost:5000/api/books \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Novel","slug":"my-novel","visibility":"public"}'
```

## 📖 Chapters

```bash
# Get all chapters for a book
curl http://localhost:5000/api/chapters/book/book-slug

# Read a chapter
curl http://localhost:5000/api/chapters/chapter-slug

# Publish draft as chapter
curl -X POST http://localhost:5000/api/drafts/DRAFT_ID/publish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"BOOK_ID","chapterNumber":1}'
```

## 📊 Reading Progress

```bash
# Save progress
curl -X PUT http://localhost:5000/api/progress/chapter-slug \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"BOOK_ID","chapterId":"CHAPTER_ID","percentage":45}'

# Get last read
curl http://localhost:5000/api/progress/last-read \
  -H "Authorization: Bearer $TOKEN"
```

## 🔖 Bookmarks & Highlights

```bash
# Create bookmark
curl -X POST http://localhost:5000/api/annotations/bookmarks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"CHAPTER_ID","chapterSlug":"slug","position":100}'

# Create highlight
curl -X POST http://localhost:5000/api/annotations/highlights \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"CHAPTER_ID","chapterSlug":"slug","selectedText":"Beautiful text","color":"yellow"}'

# Get highlights
curl http://localhost:5000/api/annotations/highlights/chapter-slug \
  -H "Authorization: Bearer $TOKEN"
```

## ⚙️ User Preferences

```bash
# Update preferences
curl -X PUT http://localhost:5000/api/users/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark","fontSize":20,"readingTheme":"星夜"}'

# Get preferences
curl http://localhost:5000/api/users/preferences \
  -H "Authorization: Bearer $TOKEN"
```

## 🛠️ Common Patterns

### Store token after login/register
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}' \
  | jq -r '.data.token')

echo $TOKEN
```

### Use token in requests
```bash
curl http://localhost:5000/api/drafts \
  -H "Authorization: Bearer $TOKEN"
```

### Pretty print JSON responses
```bash
curl http://localhost:5000/api/books | jq
```

## 📋 Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## 🔗 Base URLs

- Development: `http://localhost:5000/api`
- Production: `https://your-api.com/api`

## 📄 Headers

**All requests:**
```
Content-Type: application/json
```

**Authenticated requests:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## ⚡ Quick Test Sequence

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}' \
  > response.json

# 2. Extract token (requires jq)
TOKEN=$(cat response.json | jq -r '.data.token')

# 3. Create a draft
curl -X POST http://localhost:5000/api/drafts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chapter","body":"This is a test"}'

# 4. List your drafts
curl http://localhost:5000/api/drafts \
  -H "Authorization: Bearer $TOKEN" | jq
```
