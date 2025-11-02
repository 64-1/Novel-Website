const Annotation = require('../models/Annotation');
const { ANNOTATION_TYPES } = require('../config/constants');

/**
 * @desc    Get all bookmarks for current user
 * @route   GET /api/annotations/bookmarks
 * @access  Private
 */
const getBookmarks = async (req, res, next) => {
  try {
    const chapterSlug = req.query.chapterSlug || null;
    const bookmarks = await Annotation.getBookmarks(req.user._id, chapterSlug);

    res.status(200).json({
      success: true,
      data: {
        bookmarks: bookmarks.map(b => b.getData())
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create bookmark
 * @route   POST /api/annotations/bookmarks
 * @access  Private
 */
const createBookmark = async (req, res, next) => {
  try {
    const { chapterId, chapterSlug, position } = req.body;

    const bookmark = await Annotation.create({
      userId: req.user._id,
      chapterId,
      chapterSlug,
      type: ANNOTATION_TYPES.BOOKMARK,
      position
    });

    res.status(201).json({
      success: true,
      data: {
        bookmark: bookmark.getData()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete bookmark
 * @route   DELETE /api/annotations/bookmarks/:id
 * @access  Private
 */
const deleteBookmark = async (req, res, next) => {
  try {
    const bookmark = await Annotation.findOne({
      _id: req.params.id,
      userId: req.user._id,
      type: ANNOTATION_TYPES.BOOKMARK
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Bookmark not found'
        }
      });
    }

    await bookmark.deleteOne();

    res.status(200).json({
      success: true,
      data: {
        message: 'Bookmark deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get highlights for a chapter
 * @route   GET /api/annotations/highlights/:chapterSlug
 * @access  Private
 */
const getHighlights = async (req, res, next) => {
  try {
    const highlights = await Annotation.getHighlights(req.user._id, req.params.chapterSlug);

    res.status(200).json({
      success: true,
      data: {
        highlights: highlights.map(h => h.getData())
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create highlight
 * @route   POST /api/annotations/highlights
 * @access  Private
 */
const createHighlight = async (req, res, next) => {
  try {
    const { chapterId, chapterSlug, selectedText, rangeData, color, note } = req.body;

    const highlight = await Annotation.create({
      userId: req.user._id,
      chapterId,
      chapterSlug,
      type: ANNOTATION_TYPES.HIGHLIGHT,
      selectedText,
      rangeData,
      color,
      note: note || ''
    });

    res.status(201).json({
      success: true,
      data: {
        highlight: highlight.getData()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update highlight note
 * @route   PUT /api/annotations/highlights/:id
 * @access  Private
 */
const updateHighlight = async (req, res, next) => {
  try {
    const highlight = await Annotation.findOne({
      _id: req.params.id,
      userId: req.user._id,
      type: ANNOTATION_TYPES.HIGHLIGHT
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Highlight not found'
        }
      });
    }

    if (req.body.note !== undefined) {
      highlight.note = req.body.note;
    }
    if (req.body.color !== undefined) {
      highlight.color = req.body.color;
    }

    await highlight.save();

    res.status(200).json({
      success: true,
      data: {
        highlight: highlight.getData()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete highlight
 * @route   DELETE /api/annotations/highlights/:id
 * @access  Private
 */
const deleteHighlight = async (req, res, next) => {
  try {
    const highlight = await Annotation.findOne({
      _id: req.params.id,
      userId: req.user._id,
      type: ANNOTATION_TYPES.HIGHLIGHT
    });

    if (!highlight) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Highlight not found'
        }
      });
    }

    await highlight.deleteOne();

    res.status(200).json({
      success: true,
      data: {
        message: 'Highlight deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookmarks,
  createBookmark,
  deleteBookmark,
  getHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight
};
