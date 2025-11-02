const express = require('express');
const router = express.Router();
const {
  getDrafts,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  publishDraft
} = require('../controllers/draftController');
const { protect } = require('../middleware/auth');
const { validateDraft, validateObjectId } = require('../middleware/validators');

// All draft routes require authentication
router.use(protect);

router.get('/', getDrafts);
router.post('/', validateDraft, createDraft);
router.get('/:id', validateObjectId('id'), getDraft);
router.put('/:id', validateObjectId('id'), validateDraft, updateDraft);
router.delete('/:id', validateObjectId('id'), deleteDraft);
router.post('/:id/publish', validateObjectId('id'), publishDraft);

module.exports = router;
