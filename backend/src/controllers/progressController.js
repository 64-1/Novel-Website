const ReadingProgress = require('../models/ReadingProgress');
const Chapter = require('../models/Chapter');

/**
 * @desc    Get all reading progress for current user
 * @route   GET /api/progress
 * @access  Private
 */
const getAllProgress = async (req, res, next) => {
  try {
    const progress = await ReadingProgress.find({ userId: req.user._id })
      .sort({ lastReadAt: -1 })
      .populate('bookId', 'title slug coverImage')
      .populate('chapterId', 'title slug chapterNumber');

    res.status(200).json({
      success: true,
      data: {
        progress
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reading progress for specific chapter
 * @route   GET /api/progress/:chapterSlug
 * @access  Private
 */
const getProgressByChapter = async (req, res, next) => {
  try {
    const chapter = await Chapter.findOne({ slug: req.params.chapterSlug });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Chapter not found'
        }
      });
    }

    const progress = await ReadingProgress.findOne({
      userId: req.user._id,
      chapterId: chapter._id
    });

    if (!progress) {
      return res.status(200).json({
        success: true,
        data: {
          progress: {
            percentage: 0,
            scrollPosition: 0,
            lastReadAt: null
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        progress
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update reading progress for a chapter
 * @route   PUT /api/progress/:chapterSlug
 * @access  Private
 */
const updateProgress = async (req, res, next) => {
  try {
    const { bookId, chapterId, percentage, scrollPosition } = req.body;

    if (!bookId || !chapterId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Book ID and Chapter ID are required'
        }
      });
    }

    const progress = await ReadingProgress.updateProgress({
      userId: req.user._id,
      bookId,
      chapterId,
      chapterSlug: req.params.chapterSlug,
      percentage: percentage || 0,
      scrollPosition: scrollPosition || 0
    });

    res.status(200).json({
      success: true,
      data: {
        progress
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get last read chapter for current user
 * @route   GET /api/progress/last-read
 * @access  Private
 */
const getLastRead = async (req, res, next) => {
  try {
    const lastRead = await ReadingProgress.getLastRead(req.user._id);

    if (!lastRead) {
      return res.status(200).json({
        success: true,
        data: {
          lastRead: null
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        lastRead
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProgress,
  getProgressByChapter,
  updateProgress,
  getLastRead
};
