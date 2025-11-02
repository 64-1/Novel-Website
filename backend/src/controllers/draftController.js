const Draft = require('../models/Draft');
const Chapter = require('../models/Chapter');
const Book = require('../models/Book');
const { PAGINATION } = require('../config/constants');

/**
 * @desc    Get all drafts for current user
 * @route   GET /api/drafts
 * @access  Private
 */
const getDrafts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Filter options
    const filter = { userId: req.user._id };

    if (req.query.isPublished !== undefined) {
      filter.isPublished = req.query.isPublished === 'true';
    }

    const drafts = await Draft.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Draft.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        drafts: drafts.map(draft => draft.getSummary()),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single draft by ID
 * @route   GET /api/drafts/:id
 * @access  Private
 */
const getDraft = async (req, res, next) => {
  try {
    const draft = await Draft.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Draft not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        draft: draft.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new draft
 * @route   POST /api/drafts
 * @access  Private
 */
const createDraft = async (req, res, next) => {
  try {
    const { title, tags, body } = req.body;

    const draft = await Draft.create({
      userId: req.user._id,
      title: title || '无标题草稿',
      tags: tags || [],
      body: body || ''
    });

    res.status(201).json({
      success: true,
      data: {
        draft: draft.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update draft (auto-save)
 * @route   PUT /api/drafts/:id
 * @access  Private
 */
const updateDraft = async (req, res, next) => {
  try {
    const draft = await Draft.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Draft not found'
        }
      });
    }

    const { title, tags, body } = req.body;

    if (title !== undefined) draft.title = title;
    if (tags !== undefined) draft.tags = tags;
    if (body !== undefined) draft.body = body;

    // Increment version
    draft.version += 1;

    await draft.save();

    res.status(200).json({
      success: true,
      data: {
        draft: draft.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete draft
 * @route   DELETE /api/drafts/:id
 * @access  Private
 */
const deleteDraft = async (req, res, next) => {
  try {
    const draft = await Draft.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Draft not found'
        }
      });
    }

    await draft.deleteOne();

    res.status(200).json({
      success: true,
      data: {
        message: 'Draft deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Publish draft as chapter
 * @route   POST /api/drafts/:id/publish
 * @access  Private
 */
const publishDraft = async (req, res, next) => {
  try {
    const { bookId, chapterNumber } = req.body;

    if (!bookId || !chapterNumber) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Book ID and chapter number are required'
        }
      });
    }

    const draft = await Draft.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Draft not found'
        }
      });
    }

    // Check if book exists and user owns it
    const book = await Book.findOne({
      _id: bookId,
      authorId: req.user._id
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Book not found or you are not the author'
        }
      });
    }

    // Create chapter from draft
    const chapter = await Chapter.create({
      bookId: book._id,
      authorId: req.user._id,
      title: draft.title,
      body: draft.body,
      chapterNumber,
      isPublished: true
    });

    // Mark draft as published
    draft.isPublished = true;
    draft.publishedAsChapterId = chapter._id;
    await draft.save();

    res.status(201).json({
      success: true,
      data: {
        chapter: chapter.getFull(),
        draft: draft.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDrafts,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  publishDraft
};
