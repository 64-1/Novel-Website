const User = require('../models/User');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user.getFullProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: user.getFullProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user preferences
 * @route   GET /api/users/preferences
 * @access  Private
 */
const getPreferences = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        preferences: req.user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user preferences
 * @route   PUT /api/users/preferences
 * @access  Private
 */
const updatePreferences = async (req, res, next) => {
  try {
    const { theme, readingTheme, fontSize, lineHeight, musicVolume } = req.body;

    const user = await User.findById(req.user._id);

    if (theme !== undefined) user.preferences.theme = theme;
    if (readingTheme !== undefined) user.preferences.readingTheme = readingTheme;
    if (fontSize !== undefined) user.preferences.fontSize = fontSize;
    if (lineHeight !== undefined) user.preferences.lineHeight = lineHeight;
    if (musicVolume !== undefined) user.preferences.musicVolume = musicVolume;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public user profile by username
 * @route   GET /api/users/:username
 * @access  Public
 */
const getUserByUsername = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  getUserByUsername
};
