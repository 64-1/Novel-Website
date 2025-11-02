const mongoose = require('mongoose');
const { ANNOTATION_TYPES, HIGHLIGHT_COLORS } = require('../config/constants');

const annotationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true,
    index: true
  },
  chapterSlug: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(ANNOTATION_TYPES),
    required: true
  },

  // For bookmarks
  position: {
    type: Number,
    min: 0
  },

  // For highlights
  selectedText: {
    type: String,
    trim: true,
    maxlength: [1000, 'Selected text cannot exceed 1000 characters']
  },
  rangeData: {
    type: mongoose.Schema.Types.Mixed // Flexible structure for selection range data
  },
  color: {
    type: String,
    enum: Object.values(HIGHLIGHT_COLORS)
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Note cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for faster queries
annotationSchema.index({ userId: 1, type: 1 });
annotationSchema.index({ userId: 1, chapterId: 1 });
annotationSchema.index({ userId: 1, chapterSlug: 1, type: 1 });
annotationSchema.index({ createdAt: -1 });

// Validation: bookmarks must have position
annotationSchema.pre('validate', function(next) {
  if (this.type === ANNOTATION_TYPES.BOOKMARK && (this.position === undefined || this.position === null)) {
    this.invalidate('position', 'Position is required for bookmarks');
  }
  next();
});

// Validation: highlights must have selectedText and color
annotationSchema.pre('validate', function(next) {
  if (this.type === ANNOTATION_TYPES.HIGHLIGHT) {
    if (!this.selectedText) {
      this.invalidate('selectedText', 'Selected text is required for highlights');
    }
    if (!this.color) {
      this.invalidate('color', 'Color is required for highlights');
    }
  }
  next();
});

// Method to get annotation data
annotationSchema.methods.getData = function() {
  const base = {
    id: this._id,
    userId: this.userId,
    chapterId: this.chapterId,
    chapterSlug: this.chapterSlug,
    type: this.type,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };

  if (this.type === ANNOTATION_TYPES.BOOKMARK) {
    return {
      ...base,
      position: this.position
    };
  } else {
    return {
      ...base,
      selectedText: this.selectedText,
      rangeData: this.rangeData,
      color: this.color,
      note: this.note
    };
  }
};

// Static method to get all bookmarks for a user
annotationSchema.statics.getBookmarks = async function(userId, chapterSlug = null) {
  const query = { userId, type: ANNOTATION_TYPES.BOOKMARK };
  if (chapterSlug) {
    query.chapterSlug = chapterSlug;
  }
  return await this.find(query).sort({ createdAt: -1 });
};

// Static method to get all highlights for a chapter
annotationSchema.statics.getHighlights = async function(userId, chapterSlug) {
  return await this.find({
    userId,
    chapterSlug,
    type: ANNOTATION_TYPES.HIGHLIGHT
  }).sort({ createdAt: 1 });
};

const Annotation = mongoose.model('Annotation', annotationSchema);

module.exports = Annotation;
