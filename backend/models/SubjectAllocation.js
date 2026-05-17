const mongoose = require('mongoose');

const SubjectAllocationSchema = new mongoose.Schema({
  year:        { type: String, required: true },        // 'SY' or 'TY'
  div:         { type: String, required: true },        // 'A', 'B', etc.
  subject:     { type: String, required: true },        // 'DS2', 'MAD', etc.
  type:        { type: String, required: true },        // 'Theory', 'Lab', 'Tutorial'
  batch:       { type: String, default: '' },           // 'B1', 'B2', 'B3' or '' for theory
  teacherName: { type: String, required: true },
  weeklyHours: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SubjectAllocation', SubjectAllocationSchema);