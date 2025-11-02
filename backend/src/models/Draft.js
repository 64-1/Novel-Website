const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    default: '无标题草稿'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  body: {
    type: String,
    default: ''
  },
  wordCount: {
    type: Number,
    default: 0
  },
  metadata: {
    characterCount: {
      type: Number,
      default: 0
    },
    estimatedReadTime: {
      type: Number,
      default: 0 // in minutes
    }
  },
  version: {
    type: Number,
    default: 1
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAsChapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter'
  },
  lastSavedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
draftSchema.index({ userId: 1, updatedAt: -1 });
draftSchema.index({ userId: 1, isPublished: 1 });

// Pre-save hook to calculate word count and metadata
draftSchema.pre('save', function(next) {
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

    // Update metadata
    this.metadata.characterCount = text.length;

    // Estimate reading time (assuming 200-300 words per minute for Chinese, 250-300 for English)
    // Using conservative 200 words per minute
    this.metadata.estimatedReadTime = Math.ceil(this.wordCount / 200);

    // Update last saved timestamp
    this.lastSavedAt = Date.now();
  }
  next();
});

// Method to get draft summary (for list views)
draftSchema.methods.getSummary = function() {
  const preview = this.body
    ? this.body.substring(0, 100) + (this.body.length > 100 ? '...' : '')
    : '';

  return {
    id: this._id,
    title: this.title,
    tags: this.tags,
    preview,
    wordCount: this.wordCount,
    isPublished: this.isPublished,
    lastSavedAt: this.lastSavedAt,
    updatedAt: this.updatedAt,
    createdAt: this.createdAt
  };
};

// Method to get full draft (for editing)
draftSchema.methods.getFull = function() {
  return {
    id: this._id,
    title: this.title,
    tags: this.tags,
    body: this.body,
    wordCount: this.wordCount,
    metadata: this.metadata,
    version: this.version,
    isPublished: this.isPublished,
    publishedAsChapterId: this.publishedAsChapterId,
    lastSavedAt: this.lastSavedAt,
    updatedAt: this.updatedAt,
    createdAt: this.createdAt
  };
};

const Draft = mongoose.model('Draft', draftSchema);

module.exports = Draft;
