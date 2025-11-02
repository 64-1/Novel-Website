const Chapter = require('../models/Chapter');
const Book = require('../models/Book');
const { PAGINATION } = require('../config/constants');

/**
 * @desc    Get all chapters for a book
 * @route   GET /api/chapters/book/:bookSlug
 * @access  Public
 */
const getChaptersByBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({ slug: req.params.bookSlug });

    if (!book) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Book not found'
        }
      });
    }

    const chapters = await Chapter.find({
      bookId: book._id,
      isPublished: true
    }).sort({ chapterNumber: 1 });

    res.status(200).json({
      success: true,
      data: {
        book: book.getSummary(),
        chapters: chapters.map(ch => ch.getSummary())
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single chapter by slug
 * @route   GET /api/chapters/:slug
 * @access  Public
 */
const getChapterBySlug = async (req, res, next) => {
  try {
    const chapter = await Chapter.findOne({
      slug: req.params.slug,
      isPublished: true
    }).populate('bookId', 'title slug author');

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Chapter not found'
        }
      });
    }

    // Increment view count
    await chapter.incrementViewCount();

    res.status(200).json({
      success: true,
      data: {
        chapter: chapter.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new chapter
 * @route   POST /api/chapters
 * @access  Private
 */
const createChapter = async (req, res, next) => {
  try {
    const { bookId, title, body, chapterNumber } = req.body;

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

    // Check if chapter number already exists
    const existingChapter = await Chapter.findOne({ bookId, chapterNumber });
    if (existingChapter) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Chapter number already exists for this book'
        }
      });
    }

    const chapter = await Chapter.create({
      bookId,
      authorId: req.user._id,
      title,
      body,
      chapterNumber,
      isPublished: req.body.isPublished || false
    });

    res.status(201).json({
      success: true,
      data: {
        chapter: chapter.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update chapter
 * @route   PUT /api/chapters/:id
 * @access  Private (author only)
 */
const updateChapter = async (req, res, next) => {
  try {
    const chapter = await Chapter.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Chapter not found or you are not the author'
        }
      });
    }

    const { title, body, chapterNumber, isPublished } = req.body;

    if (title !== undefined) chapter.title = title;
    if (body !== undefined) chapter.body = body;
    if (chapterNumber !== undefined) chapter.chapterNumber = chapterNumber;
    if (isPublished !== undefined) chapter.isPublished = isPublished;

    await chapter.save();

    res.status(200).json({
      success: true,
      data: {
        chapter: chapter.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete chapter
 * @route   DELETE /api/chapters/:id
 * @access  Private (author only)
 */
const deleteChapter = async (req, res, next) => {
  try {
    const chapter = await Chapter.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Chapter not found or you are not the author'
        }
      });
    }

    await chapter.deleteOne();

    res.status(200).json({
      success: true,
      data: {
        message: 'Chapter deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChaptersByBook,
  getChapterBySlug,
  createChapter,
  updateChapter,
  deleteChapter
};
