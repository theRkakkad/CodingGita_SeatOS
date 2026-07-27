const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adminName: {
    type: String,
    required: true,
  },
  actionType: {
    type: String,
    required: true,
    enum: ['UPDATE_SETTINGS', 'REASSIGN_SEAT', 'CANCEL_SEAT', 'SUSPEND_USER', 'SEND_CREDENTIALS'],
  },
  targetId: {
    type: String, // Can be a User ID, Seat ID, etc.
    default: null,
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Stores JSON object of exactly what was changed
    default: {},
  },
  ipAddress: {
    type: String,
    required: true,
  },
}, {
  timestamps: true, // Auto-generates createdAt (timestamp)
});

module.exports = mongoose.model('ActionLog', actionLogSchema);
