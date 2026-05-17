const mongoose = require('mongoose');


const CellSchema = new mongoose.Schema({
  day:        { type: String, required: true },
  slotIndex:  { type: Number, required: true },
  slotLabel:  { type: String, required: true },
  subjectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName:{ type: String },
  subjectType:{ type: String, enum: ['theory','tutorial','lab','free'] },
  teacherId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherName:{ type: String },
  roomId:     { type: String },
  roomLabel:  { type: String },
  isFree:     { type: Boolean, default: false },
});

const TimetableSchema = new mongoose.Schema({
  divisionId:  { type: String, required: true, unique: true },
  divisionLabel:{ type: String },
  yearId:      { type: String, enum: ['SY','TY','FY'], required: true },
  cells:       { type: [CellSchema], default: [] },
  generatedAt: { type: Date, default: Date.now },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Timetable', TimetableSchema);
