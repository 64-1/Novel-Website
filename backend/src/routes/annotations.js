const express = require('express');
const router = express.Router();
const {
  getBookmarks,
  createBookmark,
  deleteBookmark,
  getHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight
} = require('../controllers/annotationController');
const { protect } = require('../middleware/auth');
const { validateAnnotation, validateObjectId } = require('../middleware/validators');

// All annotation routes require authentication
router.use(protect);

// Bookmark routes
router.get('/bookmarks', getBookmarks);
router.post('/bookmarks', validateAnnotation, createBookmark);
router.delete('/bookmarks/:id', validateObjectId('id'), deleteBookmark);

// Highlight routes
router.get('/highlights/:chapterSlug', getHighlights);
router.post('/highlights', validateAnnotation, createHighlight);
router.put('/highlights/:id', validateObjectId('id'), updateHighlight);
router.delete('/highlights/:id', validateObjectId('id'), deleteHighlight);

module.exports = router;
