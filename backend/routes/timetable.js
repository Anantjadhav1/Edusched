const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const WorkConfig = require('../models/WorkConfig');
const Year = require('../models/Year');
const Room = require('../models/Room');
const SubjectAllocation = require('../models/SubjectAllocation');
const { protect } = require('../middleware/auth');
const { generateTimetable, generateSlots } = require('../utils/scheduler');

// GET all timetables (summary)
router.get('/', protect, async (req, res) => {
  try {
    const timetables = await Timetable.find({ isActive: true }).select('-cells').sort({ yearId: 1, divisionId: 1 });
    res.json({ success: true, data: timetables });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET free slots for a division
router.get('/:divisionId/free-slots', protect, async (req, res) => {
  try {
    const tt = await Timetable.findOne({ divisionId: req.params.divisionId });
    if (!tt) return res.status(404).json({ success: false, message: 'Timetable not found' });
    const config = await WorkConfig.findOne();
    const slots = generateSlots(config.startTime, config.endTime, config.slotDuration);
    const freeSlots = [];
    config.days.forEach(day => {
      slots.forEach((slot, si) => {
        const cell = tt.cells.find(c => c.day === day && c.slotIndex === si);
        const isFree = !cell || cell.isFree === true || !cell.subjectName || cell.subjectName === '';
        if (isFree) freeSlots.push({ day, slotIndex: si, slotLabel: slot.label });
      });
    });
    res.json({ success: true, data: freeSlots });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET export CSV
router.get('/:divisionId/export', protect, async (req, res) => {
  try {
    const tt = await Timetable.findOne({ divisionId: req.params.divisionId });
    if (!tt) return res.status(404).json({ success: false, message: 'Timetable not found' });
    const config = await WorkConfig.findOne();
    const slots = generateSlots(config.startTime, config.endTime, config.slotDuration);
    let csv = 'Day,Slot,Subject,Type,Teacher,Room\n';
    config.days.forEach(day => {
      slots.forEach((slot, si) => {
        const cell = tt.cells.find(c => c.day === day && c.slotIndex === si);
        if (cell && !cell.isFree && cell.subjectName) {
          csv += `${day},"${slot.label}","${cell.subjectName}","${cell.subjectType}","${cell.teacherName}","${cell.roomLabel}"\n`;
        } else {
          csv += `${day},"${slot.label}","Free","","",""\n`;
        }
      });
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=timetable_${req.params.divisionId}.csv`);
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET single division timetable
router.get('/:divisionId', protect, async (req, res) => {
  try {
    const tt = await Timetable.findOne({ divisionId: req.params.divisionId, isActive: true });
    if (!tt) return res.status(404).json({ success: false, message: 'Timetable not found for this division' });
    res.json({ success: true, data: tt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST generate — no Express timeout, backtracking can take time
router.post('/generate', protect, async (req, res) => {
  // Set socket timeout to 10 minutes for this long-running operation
  req.socket.setTimeout(10 * 60 * 1000);
  res.setTimeout(10 * 60 * 1000);

  try {
    const config = await WorkConfig.findOne();
    if (!config) return res.status(400).json({ success: false, message: 'Work config not set' });

    const years = await Year.find();
    const totalDivisions = years.reduce((a, y) => a + y.divisions.length, 0);
    if (totalDivisions === 0) return res.status(400).json({ success: false, message: 'No divisions configured' });

    const rooms = await Room.find({ isActive: true });
    if (rooms.length === 0) return res.status(400).json({ success: false, message: 'No rooms configured' });

    const allocCount = await SubjectAllocation.countDocuments();
    if (allocCount === 0) return res.status(400).json({ success: false, message: 'No subjects allocated — upload Excel first' });

    console.log(`[GENERATE] Starting timetable generation for ${totalDivisions} divisions...`);
    const startTime = Date.now();

    const slots = generateSlots(config.startTime, config.endTime, config.slotDuration);
    const configWithSlots = { ...config.toObject(), generatedSlots: slots };
    const plainYears = years.map(y => y.toObject());
    const plainRooms = rooms.map(r => r.toObject());

    const timetables = await generateTimetable(configWithSlots, plainRooms, [], plainYears);

    await Timetable.deleteMany({});
    const savedTimetables = await Timetable.insertMany(
      timetables.map(tt => ({ ...tt, generatedAt: new Date(), isActive: true }))
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[GENERATE] Done in ${elapsed}s — ${savedTimetables.length} divisions`);

    res.status(201).json({
      success: true,
      message: `Timetables generated for ${savedTimetables.length} divisions in ${elapsed}s`,
      data: savedTimetables.map(t => ({ divisionId: t.divisionId, yearId: t.yearId, cellCount: t.cells.length })),
    });
  } catch (err) {
    console.error('[GENERATE ERROR]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT reschedule single lecture
router.put('/:divisionId/reschedule', protect, async (req, res) => {
  try {
    const { fromDay, fromSlotIndex, toDay, toSlotIndex } = req.body;
    const tt = await Timetable.findOne({ divisionId: req.params.divisionId });
    if (!tt) return res.status(404).json({ success: false, message: 'Timetable not found' });

    const srcIdx = tt.cells.findIndex(c => c.day === fromDay && c.slotIndex === fromSlotIndex);
    if (srcIdx === -1) return res.status(400).json({ success: false, message: 'Source cell not found' });

    const targetCell = tt.cells.find(c => c.day === toDay && c.slotIndex === toSlotIndex);
    const targetFree = !targetCell || targetCell.isFree === true || !targetCell.subjectName || targetCell.subjectName === '';
    if (!targetFree) return res.status(400).json({ success: false, message: 'Target slot is already occupied' });

    const config = await WorkConfig.findOne();
    const slots = generateSlots(config.startTime, config.endTime, config.slotDuration);

    const movedCell = { ...tt.cells[srcIdx].toObject(), day: toDay, slotIndex: toSlotIndex, slotLabel: slots[toSlotIndex]?.label || `Slot ${toSlotIndex + 1}` };
    tt.cells[srcIdx] = { day: fromDay, slotIndex: fromSlotIndex, slotLabel: slots[fromSlotIndex]?.label || '', subjectName: '', subjectType: 'free', teacherName: '', roomLabel: '', roomId: '', isFree: true };

    const targetIdx = tt.cells.findIndex(c => c.day === toDay && c.slotIndex === toSlotIndex);
    if (targetIdx !== -1) tt.cells[targetIdx] = movedCell;
    else tt.cells.push(movedCell);

    tt.markModified('cells');
    await tt.save();
    res.json({ success: true, message: 'Lecture rescheduled', data: tt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE all timetables
router.delete('/', protect, async (req, res) => {
  try {
    await Timetable.deleteMany({});
    res.json({ success: true, message: 'All timetables cleared' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;