const mongoose = require('mongoose');

const WorkConfigSchema = new mongoose.Schema({
  days:           { type: [String], required: true, default: ['Mon','Tue','Wed','Thu','Fri'] },
  startTime:      { type: String, required: true, default: '09:00' },
  endTime:        { type: String, required: true, default: '17:00' },
  slotDuration:   { type: Number, required: true, default: 60 },   // minutes
  maxDailyHours:  { type: Number, required: true, default: 6 },
  generatedSlots: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('WorkConfig', WorkConfigSchema);
