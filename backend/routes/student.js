const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

// @desc    Get current student's active booking
// @route   GET /api/student/my-seat
// @access  Private (Student)
router.get('/my-seat', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ studentId: req.user.id })
      .populate('classroomId', 'name code rows seatsPerRow totalSeats')
      .populate('seatId', 'seatNumber row seatIndex isBooked');

    if (!booking) {
      return res.json({
        success: true,
        hasBooking: false,
        booking: null,
      });
    }

    res.json({
      success: true,
      hasBooking: true,
      booking: {
        _id: booking._id,
        seatNumber: booking.seatNumber,
        bookedAt: booking.bookedAt,
        classroom: booking.classroomId,
        seat: booking.seatId,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving your seat details' });
  }
});

module.exports = router;
