const express = require('express');
const router = express.Router();
const Year = require('../models/Year');
const { protect } = require('../middleware/auth');

const YEAR_LABELS = { SY: 'Second Year', TY: 'Third Year', };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// GET all years
router.get('/', protect, async (req, res) => {
  try {
    for (const [yearId, label] of Object.entries(YEAR_LABELS)) {
      await Year.findOneAndUpdate({ yearId }, { yearId, label }, { upsert: true, new: true });
    }
    const years = await Year.find().sort({ yearId: 1 });
    res.json({ success: true, data: years });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT update year divisions, mode, and per-division batchCount
router.put('/:yearId', protect, async (req, res) => {
  try {
    const { yearId } = req.params;
    const { divisionCount, mode, batchCounts } = req.body;
    if (!YEAR_LABELS[yearId]) return res.status(400).json({ success: false, message: 'Invalid yearId' });

    const divisions = [];
    for (let i = 0; i < divisionCount; i++) {
      const divId = `${yearId}-${LETTERS[i]}`;
      // batchCounts is an array like [3,3,3,2,2] per division index
      const batchCount = (batchCounts && batchCounts[i]) ? parseInt(batchCounts[i]) : 3;
      divisions.push({
        divisionId: divId,
        label: `Division ${LETTERS[i]}`,
        batchCount: Math.min(4, Math.max(1, batchCount)),
      });
    }

    const year = await Year.findOneAndUpdate(
      { yearId },
      { yearId, label: YEAR_LABELS[yearId], mode, divisions },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: year, message: `${divisionCount} divisions configured for ${yearId}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;