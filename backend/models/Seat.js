const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: String,
    required: [true, 'Please add seat number'],
    trim: true,
  },
  row: {
    type: String,
    required: [true, 'Please add row name'],
    trim: true,
  },
  seatIndex: {
    type: Number,
    required: [true, 'Please add seat index'],
  },
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true,
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index to ensure seat number is unique within a classroom
seatSchema.index({ classroomId: 1, seatNumber: 1 }, { unique: true });

// Partial unique index to ensure a student can only be assigned to at most one seat across ALL classrooms
seatSchema.index(
  { bookedBy: 1 },
  {
    unique: true,
    partialFilterExpression: { bookedBy: { $exists: true, $ne: null } },
  }
);

module.exports = mongoose.model('Seat', seatSchema);
