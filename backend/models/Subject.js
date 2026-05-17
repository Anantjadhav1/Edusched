const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  code:        { type: String, required: true, trim: true },
  yearId:      { type: String, enum: ['SY', 'TY', 'FY'], required: true },
  div:         { type: String, trim: true, default: '' },
  type:        { type: String, enum: ['theory', 'tutorial', 'lab'], required: true },
  batch:       { type: String, trim: true, default: '' },
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  weeklyHours: { type: Number, required: true, min: 1 },
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);