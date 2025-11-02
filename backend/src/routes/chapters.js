const express = require('express');
const router = express.Router();
const {
  getChaptersByBook,
  getChapterBySlug,
  createChapter,
  updateChapter,
  deleteChapter
} = require('../controllers/chapterController');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateChapter, validateObjectId } = require('../middleware/validators');

// Public routes
router.get('/book/:bookSlug', getChaptersByBook);
router.get('/:slug', getChapterBySlug);

// Protected routes (require authentication)
router.post('/', protect, validateChapter, createChapter);
router.put('/:id', protect, validateObjectId('id'), updateChapter);
router.delete('/:id', protect, validateObjectId('id'), deleteChapter);

module.exports = router;
