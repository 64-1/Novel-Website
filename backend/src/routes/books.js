const express = require('express');
const router = express.Router();
const {
  getBooks,
  getBookBySlug,
  createBook,
  updateBook,
  deleteBook,
  searchBooks
} = require('../controllers/bookController');
const { protect } = require('../middleware/auth');
const { validateBook, validateObjectId } = require('../middleware/validators');

// Public routes
router.get('/', getBooks);
router.get('/search', searchBooks);
router.get('/:slug', getBookBySlug);

// Protected routes (require authentication)
router.post('/', protect, validateBook, createBook);
router.put('/:id', protect, validateObjectId('id'), validateBook, updateBook);
router.delete('/:id', protect, validateObjectId('id'), deleteBook);

module.exports = router;
