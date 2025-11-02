const mongoose = require('mongoose');
const { BOOK_STATUS, BOOK_VISIBILITY } = require('../config/constants');

const bookSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  coverImage: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  status: {
    type: String,
    enum: Object.values(BOOK_STATUS),
    default: BOOK_STATUS.DRAFT
  },
  visibility: {
    type: String,
    enum: Object.values(BOOK_VISIBILITY),
    default: BOOK_VISIBILITY.PRIVATE
  },
  stats: {
    totalChapters: {
      type: Number,
      default: 0
    },
    totalWordCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    bookmarkCount: {
      type: Number,
      default: 0
    }
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries
bookSchema.index({ slug: 1 });
bookSchema.index({ authorId: 1, createdAt: -1 });
bookSchema.index({ tags: 1 });
bookSchema.index({ status: 1, visibility: 1 });
bookSchema.index({ 'stats.viewCount': -1 }); // For trending/popular books

// Generate slug from title if not provided
bookSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    // Simple slug generation (you might want to use a library like 'slugify' for better results)
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();

    // Add timestamp to ensure uniqueness
    this.slug = `${this.slug}-${Date.now()}`;
  }

  // Set publishedAt when first published
  if (this.isModified('visibility') && this.visibility === BOOK_VISIBILITY.PUBLIC && !this.publishedAt) {
    this.publishedAt = Date.now();
  }

  next();
});

// Method to increment view count
bookSchema.methods.incrementViewCount = async function() {
  this.stats.viewCount += 1;
  await this.save();
};

// Method to get book summary (for list views)
bookSchema.methods.getSummary = function() {
  return {
    id: this._id,
    slug: this.slug,
    title: this.title,
    description: this.description ? this.description.substring(0, 150) + (this.description.length > 150 ? '...' : '') : '',
    coverImage: this.coverImage,
    tags: this.tags,
    category: this.category,
    status: this.status,
    stats: this.stats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Method to get full book details
bookSchema.methods.getFull = function() {
  return {
    id: this._id,
    slug: this.slug,
    title: this.title,
    description: this.description,
    coverImage: this.coverImage,
    tags: this.tags,
    category: this.category,
    status: this.status,
    visibility: this.visibility,
    stats: this.stats,
    publishedAt: this.publishedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
