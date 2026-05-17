const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
  divisionId:  { type: String, required: true },
  label:       { type: String, required: true },
  batchCount:  { type: Number, default: 3, min: 1, max: 4 },
});

const YearSchema = new mongoose.Schema({
  yearId:    { type: String, enum: ['SY', 'TY', ], required: true, unique: true },
  label:     { type: String, required: true },
  mode:      { type: String, enum: ['online', 'offline'], default: 'offline' },
  divisions: { type: [DivisionSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Year', YearSchema);