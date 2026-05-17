const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

// GET all rooms
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ type: 1, roomId: 1 });
    res.json({ success: true, data: rooms });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST generate rooms in bulk
router.post('/generate', protect, async (req, res) => {
  try {
    const { type, count, prefix } = req.body;
    if (!type || !count || count < 1) return res.status(400).json({ success: false, message: 'type and count required' });
    const existingCount = await Room.countDocuments({ type });
    const rooms = [];
    for (let i = 0; i < count; i++) {
      const num = String(existingCount + i + 1).padStart(2, '0');
      const pfx = prefix || (type === 'classroom' ? 'CR' : type === 'tutorial' ? 'TR' : 'LAB');
      const roomId = `${pfx}${num}`;
      const exists = await Room.findOne({ roomId });
      if (!exists) {
        rooms.push({ roomId, label: `${pfx} ${existingCount + i + 1}`, type });
      }
    }
    const created = await Room.insertMany(rooms);
    res.status(201).json({ success: true, data: created, message: `${created.length} rooms created` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST add single room
router.post('/', protect, async (req, res) => {
  try {
    const { roomId, label, type, capacity } = req.body;
    if (!roomId || !label || !type) return res.status(400).json({ success: false, message: 'roomId, label, type required' });
    const exists = await Room.findOne({ roomId });
    if (exists) return res.status(400).json({ success: false, message: 'Room ID already exists' });
    const room = await Room.create({ roomId, label, type, capacity: capacity || 60 });
    res.status(201).json({ success: true, data: room });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT update room
router.put('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE room
router.delete('/:id', protect, async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE all rooms
router.delete('/', protect, async (req, res) => {
  try {
    await Room.deleteMany({});
    res.json({ success: true, message: 'All rooms deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
