const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const Seat = require('../models/Seat');
const { protect } = require('../middleware/auth');

// @desc    Get all classrooms with dynamic booking stats
// @route   GET /api/classrooms
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student' && req.user.assignedClassroom) {
      query._id = req.user.assignedClassroom;
    }
    const classrooms = await Classroom.find(query);
    
    // Add real-time booking statistics
    const classroomsWithStats = await Promise.all(
      classrooms.map(async (classroom) => {
        const bookedCount = await Seat.countDocuments({
          classroomId: classroom._id,
          isBooked: true,
        });

        const availableCount = classroom.totalSeats - bookedCount;

        return {
          _id: classroom._id,
          name: classroom.name,
          code: classroom.code,
          rows: classroom.rows,
          seatsPerRow: classroom.seatsPerRow,
          totalSeats: classroom.totalSeats,
          bookedSeats: bookedCount,
          availableSeats: availableCount,
        };
      })
    );

    res.json({ success: true, classrooms: classroomsWithStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving classrooms' });
  }
});

// @desc    Get a single classroom details
// @route   GET /api/classrooms/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let classroom;
    
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      classroom = await Classroom.findById(req.params.id);
    } else {
      classroom = await Classroom.findOne({ code: req.params.id });
    }

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    if (req.user.role === 'student' && req.user.assignedClassroom && classroom._id.toString() !== req.user.assignedClassroom.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this classroom.' });
    }

    const bookedCount = await Seat.countDocuments({
      classroomId: classroom._id,
      isBooked: true,
    });

    const stats = {
      _id: classroom._id,
      name: classroom.name,
      code: classroom.code,
      rows: classroom.rows,
      seatsPerRow: classroom.seatsPerRow,
      totalSeats: classroom.totalSeats,
      bookedSeats: bookedCount,
      availableSeats: classroom.totalSeats - bookedCount,
    };

    res.json({ success: true, classroom: stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving classroom' });
  }
});

// @desc    Get all seats for a specific classroom
// @route   GET /api/classrooms/:classroomId/seats
// @access  Private
router.get('/:classroomId/seats', protect, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let classroomId = req.params.classroomId;

    if (!mongoose.Types.ObjectId.isValid(classroomId)) {
      const classroom = await Classroom.findOne({ code: classroomId });
      if (!classroom) {
        return res.status(404).json({ success: false, message: 'Classroom not found' });
      }
      classroomId = classroom._id;
    }

    if (req.user.role === 'student' && req.user.assignedClassroom && classroomId.toString() !== req.user.assignedClassroom.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this classroom.' });
    }

    const seats = await Seat.find({ classroomId })
      .populate('bookedBy', 'name enrollmentNo email')
      .sort({ row: 1, seatIndex: 1 });

    res.json({ success: true, seats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving classroom seats' });
  }
});

module.exports = router;
