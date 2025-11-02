const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Chapter title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  body: {
    type: String,
    required: [true, 'Chapter body is required']
  },
  chapterNumber: {
    type: Number,
    required: true,
    min: 1
  },
  wordCount: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  stats: {
    viewCount: {
      type: Number,
      default: 0
    },
    readingTime: {
      type: Number,
      default: 0 // average reading time in seconds
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
chapterSchema.index({ bookId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ slug: 1 });
chapterSchema.index({ authorId: 1, createdAt: -1 });
chapterSchema.index({ isPublished: 1, publishedAt: -1 });

// Pre-save hook to calculate word count
chapterSchema.pre('save', function(next) {
  if (this.isModified('body')) {
    // Calculate word count (works for both English and Chinese)
    const text = this.body || '';

    // Count Chinese characters
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];

    // Count English words
    const englishWords = text
      .replace(/[\u4e00-\u9fa5]/g, ' ') // Remove Chinese characters
      .match(/\b\w+\b/g) || [];

    // Word count = Chinese characters + English words
    this.wordCount = chineseChars.length + englishWords.length;
  }

  // Generate slug if not provided
  if (this.isModified('title') && !this.slug) {
    this.slug = `${this.title}-${this.chapterNumber}`
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Set publishedAt when first published
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = Date.now();
  }

  next();
});

// Post-save hook to update book stats
chapterSchema.post('save', async function(doc) {
  try {
    const Book = mongoose.model('Book');
    const book = await Book.findById(doc.bookId);

    if (book) {
      // Recalculate book stats
      const Chapter = mongoose.model('Chapter');
      const chapters = await Chapter.find({ bookId: doc.bookId, isPublished: true });

      book.stats.totalChapters = chapters.length;
      book.stats.totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

      await book.save();
    }
  } catch (error) {
    console.error('Error updating book stats:', error);
  }
});

// Method to increment view count
chapterSchema.methods.incrementViewCount = async function() {
  this.stats.viewCount += 1;
  await this.save();
};

// Method to update reading time
chapterSchema.methods.updateReadingTime = async function(timeSpent) {
  // Calculate exponential moving average
  if (this.stats.readingTime === 0) {
    this.stats.readingTime = timeSpent;
  } else {
    this.stats.readingTime = Math.round(this.stats.readingTime * 0.8 + timeSpent * 0.2);
  }
  await this.save();
};

// Method to get chapter summary (for list views)
chapterSchema.methods.getSummary = function() {
  const preview = this.body
    ? this.body.substring(0, 200) + (this.body.length > 200 ? '...' : '')
    : '';

  return {
    id: this._id,
    bookId: this.bookId,
    slug: this.slug,
    title: this.title,
    chapterNumber: this.chapterNumber,
    preview,
    wordCount: this.wordCount,
    isPublished: this.isPublished,
    publishedAt: this.publishedAt,
    stats: this.stats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Method to get full chapter (for reading)
chapterSchema.methods.getFull = function() {
  return {
    id: this._id,
    bookId: this.bookId,
    slug: this.slug,
    title: this.title,
    body: this.body,
    chapterNumber: this.chapterNumber,
    wordCount: this.wordCount,
    isPublished: this.isPublished,
    publishedAt: this.publishedAt,
    stats: this.stats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;
