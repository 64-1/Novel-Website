const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const { PAGINATION, BOOK_VISIBILITY } = require('../config/constants');

/**
 * @desc    Get all public books
 * @route   GET /api/books
 * @access  Public
 */
const getBooks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Filter for public books only
    const filter = { visibility: BOOK_VISIBILITY.PUBLIC };

    // Optional filters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // Sorting
    let sort = { createdAt: -1 }; // Default: newest first
    if (req.query.sort === 'popular') {
      sort = { 'stats.viewCount': -1 };
    } else if (req.query.sort === 'updated') {
      sort = { updatedAt: -1 };
    }

    const books = await Book.find(filter)
      .populate('authorId', 'username displayName avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Book.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        books: books.map(book => book.getSummary()),
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
 * @desc    Get book by slug
 * @route   GET /api/books/:slug
 * @access  Public
 */
const getBookBySlug = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      slug: req.params.slug,
      visibility: BOOK_VISIBILITY.PUBLIC
    }).populate('authorId', 'username displayName avatar bio');

    if (!book) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Book not found'
        }
      });
    }

    // Increment view count
    await book.incrementViewCount();

    res.status(200).json({
      success: true,
      data: {
        book: book.getFull(),
        author: book.authorId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new book
 * @route   POST /api/books
 * @access  Private
 */
const createBook = async (req, res, next) => {
  try {
    const { title, slug, description, coverImage, tags, category, status, visibility } = req.body;

    const book = await Book.create({
      authorId: req.user._id,
      title,
      slug,
      description,
      coverImage,
      tags: tags || [],
      category,
      status: status || 'draft',
      visibility: visibility || BOOK_VISIBILITY.PRIVATE
    });

    res.status(201).json({
      success: true,
      data: {
        book: book.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update book
 * @route   PUT /api/books/:id
 * @access  Private (author only)
 */
const updateBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
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

    const { title, slug, description, coverImage, tags, category, status, visibility } = req.body;

    if (title !== undefined) book.title = title;
    if (slug !== undefined) book.slug = slug;
    if (description !== undefined) book.description = description;
    if (coverImage !== undefined) book.coverImage = coverImage;
    if (tags !== undefined) book.tags = tags;
    if (category !== undefined) book.category = category;
    if (status !== undefined) book.status = status;
    if (visibility !== undefined) book.visibility = visibility;

    await book.save();

    res.status(200).json({
      success: true,
      data: {
        book: book.getFull()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete book
 * @route   DELETE /api/books/:id
 * @access  Private (author only)
 */
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
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

    // Also delete all chapters for this book
    await Chapter.deleteMany({ bookId: book._id });

    await book.deleteOne();

    res.status(200).json({
      success: true,
      data: {
        message: 'Book and all its chapters deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search books
 * @route   GET /api/books/search
 * @access  Public
 */
const searchBooks = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query is required'
        }
      });
    }

    const books = await Book.find({
      visibility: BOOK_VISIBILITY.PUBLIC,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    })
      .populate('authorId', 'username displayName')
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        results: books.map(book => book.getSummary()),
        count: books.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBooks,
  getBookBySlug,
  createBook,
  updateBook,
  deleteBook,
  searchBooks
};
