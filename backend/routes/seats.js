const express = require('express');
const router = express.Router();
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');
const haversine = require('haversine-distance');
const { z } = require('zod');

// Booking Validation Schema
const bookSeatSchema = z.object({
  seatId: z.string().min(24, "Invalid seat ID"),
  photo: z.string().min(10, "Photo is required for face verification"),
  latitude: z.number({ required_error: "Latitude is required", invalid_type_error: "Latitude must be a number" }),
  longitude: z.number({ required_error: "Longitude is required", invalid_type_error: "Longitude must be a number" })
});

// Mock Lab Coordinates
const LAB_LAT = process.env.LAB_LAT ? parseFloat(process.env.LAB_LAT) : 23.0225;
const LAB_LNG = process.env.LAB_LNG ? parseFloat(process.env.LAB_LNG) : 72.5714;
const MAX_DISTANCE_METERS = 50000; // Increased for testing, adjust as needed



// Middleware to check if seat booking is open (admins bypass this)
const checkBookingOpen = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    const bookingSetting = await Settings.findOne({ key: 'booking_open' });
    const isBookingOpen = bookingSetting ? bookingSetting.value === true : false;
    
    if (!isBookingOpen) {
      return res.status(403).json({ success: false, message: 'Seat booking is currently closed.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

// @desc    Get booking status
// @route   GET /api/seats/booking-status
// @access  Public
router.get('/booking-status', async (req, res) => {
  try {
    const bookingSetting = await Settings.findOne({ key: 'booking_open' });
    const bookingOpen = bookingSetting ? bookingSetting.value === true : false;
    res.json({ success: true, bookingOpen });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error checking booking status' });
  }
});

// @desc    Book a classroom seat
// @route   POST /api/seats/book
// @access  Private (Student)
router.post('/book', protect, checkBookingOpen, async (req, res) => {
  const parsed = bookSeatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const { seatId, photo, latitude, longitude } = parsed.data;

  // 1. Verify Geolocation
  const studentLocation = { lat: latitude, lon: longitude };
  const labLocation = { lat: LAB_LAT, lon: LAB_LNG };
  const distance = haversine(studentLocation, labLocation);

  if (distance > MAX_DISTANCE_METERS) {
    return res.status(403).json({ success: false, message: `Access denied. You must be physically present in the lab. (Distance: ${Math.round(distance)}m)` });
  }

  // 2. Extract IP Address
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();

  try {
    // Check if the seat exists and verify classroom assignment
    const targetSeat = await Seat.findById(seatId);
    if (!targetSeat) {
      return res.status(404).json({ success: false, message: 'Seat not found' });
    }

    if (req.user.role === 'student' && req.user.assignedClassroom && targetSeat.classroomId.toString() !== req.user.assignedClassroom.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this classroom.' });
    }

    // 1. Check if the student already has an active booking across both classrooms
    const existingBooking = await Booking.findOne({ studentId: req.user.id });
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have booked a seat. Please cancel or change it instead.',
      });
    }

    // 2. Atomically reserve the seat (must be currently unbooked)
    const seat = await Seat.findOneAndUpdate(
      { _id: seatId, isBooked: false, bookedBy: null },
      { isBooked: true, bookedBy: req.user.id },
      { new: true }
    );

    // If seat is null, it was already booked by another student (race condition handled)
    if (!seat) {
      return res.status(400).json({
        success: false,
        message: 'This seat has already been booked by another student.',
      });
    }

    // 3. Create the booking document
    let booking;
    try {
      booking = await Booking.create({
        studentId: req.user.id,
        classroomId: seat.classroomId,
        seatId: seat._id,
        seatNumber: seat.seatNumber,
        photoUrl: photo,
        ipAddress,
        latitude,
        longitude
      });
    } catch (bookingError) {
      // Rollback the seat reservation if booking document creation fails
      await Seat.updateOne(
        { _id: seatId },
        { isBooked: false, bookedBy: null }
      );
      return res.status(400).json({
        success: false,
        message: 'Booking failed. You may already have a booked seat.',
      });
    }

    // 4. Emit Socket.IO events for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Broadcast seat booked event to students in the classroom room
      io.to(`classroom:${seat.classroomId}`).emit('seat:booked', {
        seatId: seat._id,
        seatNumber: seat.seatNumber,
        bookedBy: {
          _id: req.user._id,
          name: req.user.name,
          enrollmentNo: req.user.enrollmentNo,
        },
      });

      // Broadcast global classroom stats update
      io.emit('classroom:update');
    }

    res.status(201).json({
      success: true,
      message: `Seat ${seat.seatNumber} successfully booked`,
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error booking seat' });
  }
});

// @desc    Cancel student's current booking
// @route   DELETE /api/seats/cancel
// @access  Private (Student)
router.delete('/cancel', protect, checkBookingOpen, async (req, res) => {
  try {
    // 1. Find student's active booking
    const booking = await Booking.findOne({ studentId: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'No active booking found for you' });
    }

    // 2. Remove the Booking document
    await Booking.deleteOne({ _id: booking._id });

    // 3. Mark the Seat as available
    await Seat.updateOne(
      { _id: booking.seatId },
      { isBooked: false, bookedBy: null }
    );

    // 4. Emit Socket.IO events for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Broadcast seat cancelled event to classroom room
      io.to(`classroom:${booking.classroomId}`).emit('seat:cancelled', {
        seatId: booking.seatId,
        seatNumber: booking.seatNumber,
      });

      // Broadcast global classroom stats update
      io.emit('classroom:update');
    }

    res.json({ success: true, message: 'Booking successfully cancelled' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error cancelling booking' });
  }
});

// @desc    Change seat to a new seat
// @route   PUT /api/seats/change
// @access  Private (Student)
router.put('/change', protect, checkBookingOpen, async (req, res) => {
  const { newSeatId, photo, latitude, longitude } = req.body;

  if (!newSeatId || !photo || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: 'Please provide newSeatId, photo, latitude, and longitude' });
  }

  // 1. Verify Geolocation
  const studentLocation = { lat: latitude, lon: longitude };
  const labLocation = { lat: LAB_LAT, lon: LAB_LNG };
  const distance = haversine(studentLocation, labLocation);

  if (distance > MAX_DISTANCE_METERS) {
    return res.status(403).json({ success: false, message: `Access denied. You must be physically present in the lab. (Distance: ${Math.round(distance)}m)` });
  }

  // 2. Extract IP Address
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();

  try {
    // 1. Find the current booking
    const oldBooking = await Booking.findOne({ studentId: req.user.id });
    if (!oldBooking) {
      return res.status(400).json({
        success: false,
        message: 'You do not have a seat booked yet. Use the booking API instead.',
      });
    }

    // Check if user is booking the exact same seat
    if (oldBooking.seatId.toString() === newSeatId) {
      return res.status(400).json({ success: false, message: 'You are already booked on this seat' });
    }

    // 2. Check if new seat exists and is available
    const newSeat = await Seat.findById(newSeatId);
    if (!newSeat) {
      return res.status(404).json({ success: false, message: 'The new seat does not exist' });
    }

    if (newSeat.isBooked) {
      return res.status(400).json({
        success: false,
        message: 'This seat has already been booked by another student.',
      });
    }

    // 3. Release old seat first
    await Seat.updateOne(
      { _id: oldBooking.seatId },
      { isBooked: false, bookedBy: null }
    );

    // 4. Atomically try to reserve the new seat
    const reservedNewSeat = await Seat.findOneAndUpdate(
      { _id: newSeatId, isBooked: false, bookedBy: null },
      { isBooked: true, bookedBy: req.user.id },
      { new: true }
    );

    // If new seat was taken in the split second between check and reserve
    if (!reservedNewSeat) {
      // Rollback: Re-reserve the old seat
      await Seat.updateOne(
        { _id: oldBooking.seatId },
        { isBooked: true, bookedBy: req.user.id }
      );
      return res.status(400).json({
        success: false,
        message: 'This seat has already been booked by another student.',
      });
    }

    // 5. Update the booking document
    await Booking.updateOne(
      { studentId: req.user.id },
      {
        classroomId: reservedNewSeat.classroomId,
        seatId: reservedNewSeat._id,
        seatNumber: reservedNewSeat.seatNumber,
        photoUrl: photo,
        ipAddress,
        latitude,
        longitude,
        bookedAt: new Date(),
      }
    );

    // 6. Emit Socket.IO events for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Broadcast cancel event to old classroom room
      io.to(`classroom:${oldBooking.classroomId}`).emit('seat:cancelled', {
        seatId: oldBooking.seatId,
        seatNumber: oldBooking.seatNumber,
      });

      // Broadcast book event to new classroom room
      io.to(`classroom:${reservedNewSeat.classroomId}`).emit('seat:booked', {
        seatId: reservedNewSeat._id,
        seatNumber: reservedNewSeat.seatNumber,
        bookedBy: {
          _id: req.user._id,
          name: req.user.name,
          enrollmentNo: req.user.enrollmentNo,
        },
      });

      // Broadcast global classroom stats update
      io.emit('classroom:update');
    }

    res.json({
      success: true,
      message: `Seat changed successfully to ${reservedNewSeat.seatNumber}`,
      seatNumber: reservedNewSeat.seatNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error changing seat' });
  }
});

module.exports = router;
