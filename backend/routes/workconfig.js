const express = require('express');
const router = express.Router();
const WorkConfig = require('../models/WorkConfig');
const { protect } = require('../middleware/auth');

// Helper: generate time slots from config
function generateSlots(startTime, endTime, slotDuration) {
  const slots = [];
  let [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const endMins = eh * 60 + em;
  let cur = sh * 60 + sm;
  while (cur + slotDuration <= endMins) {
    const s = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
    const e = `${String(Math.floor((cur + slotDuration) / 60)).padStart(2, '0')}:${String((cur + slotDuration) % 60).padStart(2, '0')}`;
    slots.push(`${s}-${e}`);
    cur += slotDuration;
  }
  return slots;
}

// GET current config
router.get('/', protect, async (req, res) => {
  try {
    let config = await WorkConfig.findOne();
    if (!config) {
      config = await WorkConfig.create({});
    }
    res.json({ success: true, data: config });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT save config and auto-generate slots
router.put('/', protect, async (req, res) => {
  try {
    const { days, startTime, endTime, slotDuration, maxDailyHours } = req.body;
    const generatedSlots = generateSlots(startTime, endTime, slotDuration);
    let config = await WorkConfig.findOne();
    if (!config) {
      config = await WorkConfig.create({ days, startTime, endTime, slotDuration, maxDailyHours, generatedSlots });
    } else {
      config = await WorkConfig.findOneAndUpdate({}, { days, startTime, endTime, slotDuration, maxDailyHours, generatedSlots }, { new: true });
    }
    res.json({ success: true, data: config, message: `Config saved. ${generatedSlots.length} slots generated.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
