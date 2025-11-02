const mongoose = require('mongoose');

const readingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  chapterSlug: {
    type: String,
    required: true,
    trim: true
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  scrollPosition: {
    type: Number,
    default: 0
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
readingProgressSchema.index({ userId: 1, bookId: 1 });
readingProgressSchema.index({ userId: 1, chapterId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, lastReadAt: -1 });

// Update lastReadAt on save
readingProgressSchema.pre('save', function(next) {
  this.lastReadAt = Date.now();
  next();
});

// Static method to get or create progress
readingProgressSchema.statics.updateProgress = async function(data) {
  const { userId, bookId, chapterId, chapterSlug, percentage, scrollPosition } = data;

  return await this.findOneAndUpdate(
    { userId, chapterId },
    {
      userId,
      bookId,
      chapterId,
      chapterSlug,
      percentage,
      scrollPosition,
      lastReadAt: Date.now()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// Static method to get last read chapter for a user
readingProgressSchema.statics.getLastRead = async function(userId) {
  return await this.findOne({ userId })
    .sort({ lastReadAt: -1 })
    .populate('bookId', 'title slug coverImage')
    .populate('chapterId', 'title slug chapterNumber');
};

const ReadingProgress = mongoose.model('ReadingProgress', readingProgressSchema);

module.exports = ReadingProgress;
