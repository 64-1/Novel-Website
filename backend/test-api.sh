#!/bin/bash

# Novel-Website Backend API Test Script
# This script tests all major endpoints to verify the backend is working

set -e  # Exit on error

API_URL="http://localhost:5000/api"
TIMESTAMP=$(date +%s)
TEST_USER="testuser_${TIMESTAMP}"
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASSWORD="testpass123"

echo "========================================="
echo "Novel-Website Backend API Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Helper function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Helper function to print info
info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

echo "Testing backend at: $API_URL"
echo ""

# Test 1: Health Check
info "Test 1: Health Check"
HEALTH=$(curl -s "${API_URL%/api}/health")
if echo "$HEALTH" | grep -q '"success":true'; then
    success "Server is healthy"
else
    error "Health check failed"
    exit 1
fi
echo ""

# Test 2: Register User
info "Test 2: Register User"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USER\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"displayName\": \"Test User\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    success "User registered successfully"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    info "Token: ${TOKEN:0:20}..."
    info "User ID: $USER_ID"
else
    error "User registration failed"
    echo "$REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Get Current User
info "Test 3: Get Current User"
ME_RESPONSE=$(curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "\"username\":\"$TEST_USER\""; then
    success "Retrieved current user"
else
    error "Failed to get current user"
    exit 1
fi
echo ""

# Test 4: Update User Preferences
info "Test 4: Update User Preferences"
PREF_RESPONSE=$(curl -s -X PUT "$API_URL/users/preferences" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "dark",
    "readingTheme": "星夜",
    "fontSize": 20,
    "lineHeight": 2.0,
    "musicVolume": 75
  }')

if echo "$PREF_RESPONSE" | grep -q '"success":true'; then
    success "Updated user preferences"
else
    error "Failed to update preferences"
    exit 1
fi
echo ""

# Test 5: Create a Draft
info "Test 5: Create Draft"
DRAFT_RESPONSE=$(curl -s -X POST "$API_URL/drafts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Chapter: The Beginning",
    "tags": ["fantasy", "test"],
    "body": "Once upon a time, in a land far away, there lived a brave developer who created a novel-writing platform. The platform was magical, allowing writers to craft their stories with ease. 这是一个测试文本，包含中文字符。"
  }')

if echo "$DRAFT_RESPONSE" | grep -q '"success":true'; then
    success "Created draft"
    DRAFT_ID=$(echo "$DRAFT_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
    WORD_COUNT=$(echo "$DRAFT_RESPONSE" | grep -o '"wordCount":[0-9]*' | cut -d':' -f2)
    info "Draft ID: $DRAFT_ID"
    info "Word count: $WORD_COUNT"
else
    error "Failed to create draft"
    echo "$DRAFT_RESPONSE"
    exit 1
fi
echo ""

# Test 6: Update Draft
info "Test 6: Update Draft (Auto-save)"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Once upon a time, in a land far away, there lived a brave developer who created a novel-writing platform. The platform was magical, allowing writers to craft their stories with ease. Writers from around the world gathered to share their tales. 这是一个更新的测试文本，包含更多中文字符。The end... or is it just the beginning?"
  }')

if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
    success "Updated draft"
    NEW_WORD_COUNT=$(echo "$UPDATE_RESPONSE" | grep -o '"wordCount":[0-9]*' | cut -d':' -f2)
    VERSION=$(echo "$UPDATE_RESPONSE" | grep -o '"version":[0-9]*' | cut -d':' -f2)
    info "New word count: $NEW_WORD_COUNT"
    info "Version: $VERSION"
else
    error "Failed to update draft"
    exit 1
fi
echo ""

# Test 7: List Drafts
info "Test 7: List All Drafts"
LIST_RESPONSE=$(curl -s "$API_URL/drafts" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LIST_RESPONSE" | grep -q '"success":true'; then
    DRAFT_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    success "Retrieved drafts (total: $DRAFT_COUNT)"
else
    error "Failed to list drafts"
    exit 1
fi
echo ""

# Test 8: Create a Book
info "Test 8: Create Book"
BOOK_RESPONSE=$(curl -s -X POST "$API_URL/books" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"The Developer's Tale\",
    \"slug\": \"developers-tale-${TIMESTAMP}\",
    \"description\": \"An epic story of code, bugs, and triumph\",
    \"tags\": [\"fantasy\", \"adventure\", \"coding\"],
    \"category\": \"Fantasy\",
    \"visibility\": \"public\",
    \"status\": \"ongoing\"
  }")

if echo "$BOOK_RESPONSE" | grep -q '"success":true'; then
    success "Created book"
    BOOK_ID=$(echo "$BOOK_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
    BOOK_SLUG=$(echo "$BOOK_RESPONSE" | grep -o '"slug":"[^"]*' | cut -d'"' -f4 | head -1)
    info "Book ID: $BOOK_ID"
    info "Book slug: $BOOK_SLUG"
else
    error "Failed to create book"
    echo "$BOOK_RESPONSE"
    exit 1
fi
echo ""

# Test 9: Publish Draft as Chapter
info "Test 9: Publish Draft as Chapter"
PUBLISH_RESPONSE=$(curl -s -X POST "$API_URL/drafts/$DRAFT_ID/publish" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookId\": \"$BOOK_ID\",
    \"chapterNumber\": 1
  }")

if echo "$PUBLISH_RESPONSE" | grep -q '"success":true'; then
    success "Published draft as chapter"
    CHAPTER_ID=$(echo "$PUBLISH_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
    CHAPTER_SLUG=$(echo "$PUBLISH_RESPONSE" | grep -o '"slug":"[^"]*' | cut -d'"' -f4 | head -1)
    info "Chapter ID: $CHAPTER_ID"
    info "Chapter slug: $CHAPTER_SLUG"
else
    error "Failed to publish chapter"
    echo "$PUBLISH_RESPONSE"
    exit 1
fi
echo ""

# Test 10: Get Public Books
info "Test 10: Browse Public Books"
BOOKS_RESPONSE=$(curl -s "$API_URL/books")

if echo "$BOOKS_RESPONSE" | grep -q '"success":true'; then
    success "Retrieved public books"
else
    error "Failed to get books"
    exit 1
fi
echo ""

# Test 11: Get Chapters for Book
info "Test 11: Get Chapters for Book"
CHAPTERS_RESPONSE=$(curl -s "$API_URL/chapters/book/$BOOK_SLUG")

if echo "$CHAPTERS_RESPONSE" | grep -q '"success":true'; then
    success "Retrieved chapters for book"
else
    error "Failed to get chapters"
    exit 1
fi
echo ""

# Test 12: Read Chapter
info "Test 12: Read Chapter"
CHAPTER_RESPONSE=$(curl -s "$API_URL/chapters/$CHAPTER_SLUG")

if echo "$CHAPTER_RESPONSE" | grep -q '"success":true'; then
    success "Retrieved chapter content"
else
    error "Failed to read chapter"
    exit 1
fi
echo ""

# Test 13: Save Reading Progress
info "Test 13: Save Reading Progress"
PROGRESS_RESPONSE=$(curl -s -X PUT "$API_URL/progress/$CHAPTER_SLUG" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookId\": \"$BOOK_ID\",
    \"chapterId\": \"$CHAPTER_ID\",
    \"percentage\": 75,
    \"scrollPosition\": 1500
  }")

if echo "$PROGRESS_RESPONSE" | grep -q '"success":true'; then
    success "Saved reading progress (75%)"
else
    error "Failed to save progress"
    exit 1
fi
echo ""

# Test 14: Get Last Read
info "Test 14: Get Last Read Chapter"
LASTREAD_RESPONSE=$(curl -s "$API_URL/progress/last-read" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LASTREAD_RESPONSE" | grep -q '"success":true'; then
    success "Retrieved last read chapter"
else
    error "Failed to get last read"
    exit 1
fi
echo ""

# Test 15: Create Bookmark
info "Test 15: Create Bookmark"
BOOKMARK_RESPONSE=$(curl -s -X POST "$API_URL/annotations/bookmarks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"chapterId\": \"$CHAPTER_ID\",
    \"chapterSlug\": \"$CHAPTER_SLUG\",
    \"type\": \"bookmark\",
    \"position\": 1234
  }")

if echo "$BOOKMARK_RESPONSE" | grep -q '"success":true'; then
    success "Created bookmark"
else
    error "Failed to create bookmark"
    exit 1
fi
echo ""

# Test 16: Create Highlight
info "Test 16: Create Highlight"
HIGHLIGHT_RESPONSE=$(curl -s -X POST "$API_URL/annotations/highlights" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"chapterId\": \"$CHAPTER_ID\",
    \"chapterSlug\": \"$CHAPTER_SLUG\",
    \"type\": \"highlight\",
    \"selectedText\": \"The platform was magical\",
    \"color\": \"yellow\",
    \"note\": \"Great imagery!\",
    \"rangeData\": {\"start\": 45, \"end\": 70}
  }")

if echo "$HIGHLIGHT_RESPONSE" | grep -q '"success":true'; then
    success "Created highlight"
else
    error "Failed to create highlight"
    exit 1
fi
echo ""

# Test 17: Get Highlights
info "Test 17: Get Highlights for Chapter"
HIGHLIGHTS_RESPONSE=$(curl -s "$API_URL/annotations/highlights/$CHAPTER_SLUG" \
  -H "Authorization: Bearer $TOKEN")

if echo "$HIGHLIGHTS_RESPONSE" | grep -q '"success":true'; then
    success "Retrieved highlights"
else
    error "Failed to get highlights"
    exit 1
fi
echo ""

# Test 18: Logout
info "Test 18: Logout"
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
    success "Logged out successfully"
else
    error "Failed to logout"
    exit 1
fi
echo ""

# Test 19: Login Again
info "Test 19: Login with Existing Account"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    success "Logged in successfully"
    NEW_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    info "New token: ${NEW_TOKEN:0:20}..."
else
    error "Failed to login"
    exit 1
fi
echo ""

echo "========================================="
echo -e "${GREEN}All Tests Passed! ✓${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  - User created: $TEST_EMAIL"
echo "  - Draft created and published"
echo "  - Book created: $BOOK_SLUG"
echo "  - Chapter published: $CHAPTER_SLUG"
echo "  - Reading progress tracked"
echo "  - Annotations created"
echo "  - Login/logout working"
echo ""
echo "Your backend is fully functional! 🎉"
echo ""
