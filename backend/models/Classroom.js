const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a classroom name'],
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Please add a classroom code'],
    unique: true,
    trim: true,
  },
  rows: {
    type: Number,
    required: [true, 'Please add the number of rows'],
  },
  seatsPerRow: {
    type: Number,
    required: [true, 'Please add seats per row'],
  },
  totalSeats: {
    type: Number,
    required: [true, 'Please add total capacity'],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Classroom', classroomSchema);
