const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId:   { type: String, required: true, unique: true, trim: true },
  label:    { type: String, required: true },
  type:     { type: String, enum: ['classroom', 'tutorial', 'lab'], required: true },
  capacity: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
