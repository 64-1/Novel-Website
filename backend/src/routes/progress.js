const express = require('express');
const router = express.Router();
const {
  getAllProgress,
  getProgressByChapter,
  updateProgress,
  getLastRead
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');
const { validateProgress } = require('../middleware/validators');

// All progress routes require authentication
router.use(protect);

router.get('/', getAllProgress);
router.get('/last-read', getLastRead);
router.get('/:chapterSlug', getProgressByChapter);
router.put('/:chapterSlug', validateProgress, updateProgress);

module.exports = router;
