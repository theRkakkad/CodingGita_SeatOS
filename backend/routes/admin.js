const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Settings = require('../models/Settings');
const LoginLog = require('../models/LoginLog');
const { protect, authorize } = require('../middleware/auth');
const sendEmailUtil = require('../utils/sendEmail');

const generateRandomPassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = lowercase + uppercase + numbers;
  
  let pass = '';
  pass += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  pass += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  for (let i = 3; i < 8; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  return pass.split('').sort(() => 0.5 - Math.random()).join('');
};

const getGodLevelEmailTemplate = (student, classroom, seat, type = 'booking') => {
  const portalUrl = 'https://seat-booking-website-flax.vercel.app/login';
  
  let headerColor = '#10b981';
  let headerTitle = 'Seat Booking Confirmed!';
  let actionText = 'An administrator has successfully booked a seat for you on the portal.';
  
  if (type === 'reassign') {
    headerColor = '#f9ca3a';
    headerTitle = 'Seat Reassigned to You!';
    actionText = 'An administrator has successfully reassigned a seat to you on the portal.';
  } else if (type === 'cancel') {
    headerColor = '#ef4444';
    headerTitle = 'Seat Reservation Revoked';
    actionText = 'An administrator has cancelled your seat booking reservation on the portal.';
  }

  const showCredentials = type !== 'cancel' && student.email;
  const tempPassword = student.plainPassword || 'studentpassword123';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b071a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }
    .wrapper {
      width: 100%;
      background-color: #0b071a;
      padding: 40px 0;
    }
    .main-card {
      max-width: 540px;
      margin: 0 auto;
      background: linear-gradient(180deg, #130a2a 0%, #1a0f3c 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
    }
    .glow-bar {
      height: 5px;
      background: linear-gradient(90deg, #7c3aed, #f9ca3a, #7c3aed);
    }
    .header {
      padding: 35px 35px 15px 35px;
      text-align: center;
    }
    .logo {
      height: 40px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      margin: 10px 0 5px 0;
    }
    .content {
      padding: 0 35px 35px 35px;
    }
    .greeting {
      font-size: 15px;
      color: #e2e8f0;
      margin-bottom: 15px;
      line-height: 1.6;
    }
    .details-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .detail-row {
      display: block;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-row:first-child {
      padding-top: 0;
    }
    .detail-label {
      font-size: 11px;
      color: #a78bfa;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
      width: 120px;
    }
    .detail-value {
      font-size: 14px;
      color: #ffffff;
      font-weight: 700;
      display: inline-block;
    }
    .credentials-box {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(249, 202, 58, 0.04) 100%);
      border: 1px solid rgba(124, 58, 237, 0.2);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .credentials-title {
      font-size: 13px;
      color: #f9ca3a;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .credential-item {
      font-size: 13px;
      color: #e2e8f0;
      margin: 8px 0;
    }
    .credential-code {
      font-family: monospace;
      background: rgba(0, 0, 0, 0.3);
      padding: 3px 6px;
      border-radius: 4px;
      color: #ffffff;
      font-weight: bold;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-container {
      text-align: center;
      margin: 25px 0 10px 0;
    }
    .action-btn {
      display: inline-block;
      padding: 14px 30px;
      background: linear-gradient(90deg, #7c3aed, #6d28d9);
      border-radius: 12px;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="glow-bar"></div>
      <div class="header">
        <h2 class="title" style="color: ${headerColor};">${headerTitle}</h2>
      </div>
      <div class="content">
        <p class="greeting">Hello <strong>${student.name}</strong>,</p>
        <p class="greeting" style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">${actionText}</p>
        
        <div class="details-box">
          <div class="detail-row">
            <span class="detail-label">Classroom:</span>
            <span class="detail-value">${classroom ? classroom.name : 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Seat Number:</span>
            <span class="detail-value" style="color: #f9ca3a;">${seat ? seat.seatNumber : 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Enrollment:</span>
            <span class="detail-value">${student.enrollmentNo || 'N/A'}</span>
          </div>
        </div>

        ${showCredentials ? `
        <div class="credentials-box">
          <div class="credentials-title">🔐 PORTAL LOGIN CREDENTIALS</div>
          <div class="credential-item">
            <strong>Email:</strong> <span class="credential-code">${student.email}</span>
          </div>
          <div class="credential-item">
            <strong>Password:</strong> <span class="credential-code">${tempPassword}</span>
          </div>
          <p style="font-size: 11px; color: #a78bfa; margin: 10px 0 0 0; line-height: 1.4;">
            * Use these credentials to access your Student Portal dashboard.
          </p>
        </div>
        ` : ''}

        <div class="btn-container">
          <a class="action-btn" href="${portalUrl}" target="_blank">Access SeatSync Portal</a>
        </div>

        <div class="footer">
          <p>This is an automated notification from SeatSync.</p>
          <p>&copy; ${new Date().getFullYear()} CodingGita. All rights reserved.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

const sendBulkCredentials = async () => {
  console.log('[BULK EMAIL] Starting bulk credentials dispatch to students...');
  try {
    const students = await User.find({ role: 'student', credentialsSent: { $ne: true } });
    console.log(`[BULK EMAIL] Found ${students.length} students pending credentials.`);

    for (const student of students) {
      try {
        let className = 'Unassigned';
        let classroom = null;
        if (student.assignedClassroom) {
          classroom = await Classroom.findById(student.assignedClassroom);
          className = classroom ? classroom.name : 'Classroom';
        }

        let password = student.plainPassword;
        if (!password) {
          password = generateRandomPassword();
          let passExists = await User.findOne({ plainPassword: password });
          while (passExists) {
            password = generateRandomPassword();
            passExists = await User.findOne({ plainPassword: password });
          }
          student.password = password;
          student.plainPassword = password;
        }

        const booking = await Booking.findOne({ studentId: student._id });

        const emailSubject = 'Welcome to CodingGita - SeatSync Account Confirmed!';
        const emailText = `Hello ${student.name},\n\nYour student account login credentials for CodingGita SeatSync:\n - Portal Link: https://seat-booking-website-flax.vercel.app/login\n - Email Address: ${student.email}\n - Password: ${password}\n - Assigned Classroom: ${className}\n\nBest Regards,\nCodingGita Admin Team`;
        const emailHtml = getGodLevelEmailTemplate(student, classroom, booking || { seatNumber: 'N/A' }, 'booking');

        await sendEmailUtil({
          email: student.email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
          forceSend: true,
        });

        student.credentialsSent = true;
        await student.save();
        console.log(`[BULK EMAIL] Successfully sent login credentials to student: ${student.email}`);

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[BULK EMAIL] Error sending credentials to ${student?.email || 'unknown student'}:`, err.message);
      }
    }
    console.log('[BULK EMAIL] Completed bulk credentials dispatch.');
  } catch (error) {
    console.error('[BULK EMAIL] Critical failure during bulk dispatch loop:', error);
  }
};

// Apply protection & admin verification to all admin routes
router.use(protect);
router.use(authorize('admin', 'info_admin'));

// @desc    Get overall and per-classroom statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
router.get('/stats', async (req, res) => {
  try {
    // 1. Overall statistics
    const totalStudents = await User.countDocuments({ role: 'student' });
    const classrooms = await Classroom.find();
    
    let totalSeats = 0;
    let totalBookedSeats = 0;
    
    const classroomBreakdown = await Promise.all(
      classrooms.map(async (classroom) => {
        const booked = await Seat.countDocuments({ classroomId: classroom._id, isBooked: true });
        const available = classroom.totalSeats - booked;
        const percentage = classroom.totalSeats > 0 
          ? Number(((booked / classroom.totalSeats) * 100).toFixed(1))
          : 0;
        
        totalSeats += classroom.totalSeats;
        totalBookedSeats += booked;

        return {
          _id: classroom._id,
          name: classroom.name,
          code: classroom.code,
          capacity: classroom.totalSeats,
          bookedSeats: booked,
          availableSeats: available,
          bookingPercentage: percentage,
        };
      })
    );

    const overallPercentage = totalSeats > 0 
      ? Number(((totalBookedSeats / totalSeats) * 100).toFixed(1))
      : 0;

    // 2. Historical Trends (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const bookingTrendsRaw = await Booking.aggregate([
      { $match: { bookedAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookedAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const loginTrendsRaw = await LoginLog.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Format trends for frontend (fill in missing days with 0)
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const bFound = bookingTrendsRaw.find(x => x._id === dateStr);
      const lFound = loginTrendsRaw.find(x => x._id === dateStr);
      trends.push({
        date: dateStr,
        bookings: bFound ? bFound.count : 0,
        logins: lFound ? lFound.count : 0
      });
    }

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalClassrooms: classrooms.length,
        totalSeats,
        totalBookedSeats,
        totalAvailableSeats: totalSeats - totalBookedSeats,
        overallBookingPercentage: overallPercentage,
        classrooms: classroomBreakdown,
        trends
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving statistics' });
  }
});

// @desc    Export bookings as CSV
// @route   GET /api/admin/export/bookings
// @access  Private (Admin)
router.get('/export/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('studentId', 'name enrollmentNo email')
      .populate('classroomId', 'name code')
      .sort({ bookedAt: -1 });

    let csvContent = 'Booking Date,Student Name,Enrollment No,Email,Classroom,Seat Number,IP Address\n';

    bookings.forEach(b => {
      const date = b.bookedAt ? b.bookedAt.toISOString().split('T')[0] : 'N/A';
      const studentName = b.studentId ? b.studentId.name : 'Unknown';
      const enrollmentNo = b.studentId ? b.studentId.enrollmentNo : 'Unknown';
      const email = b.studentId ? b.studentId.email : 'Unknown';
      const classroom = b.classroomId ? b.classroomId.name : 'Unknown';
      const seatNo = b.seatNumber || 'N/A';
      const ip = b.ipAddress || 'Unknown';
      
      // Escape commas by wrapping in quotes
      csvContent += `"${date}","${studentName}","${enrollmentNo}","${email}","${classroom}","${seatNo}","${ip}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings_export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('CSV Export Error:', error);
    res.status(500).send('Server error exporting data');
  }
});

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private (Admin)
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('studentId', 'name enrollmentNo email')
      .populate('classroomId', 'name code')
      .sort({ bookedAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving bookings' });
  }
});

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private (Admin)
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .populate('assignedClassroom', 'name code')
      .select('name enrollmentNo email dob plainPassword assignedClassroom createdAt');
    
    // Attach booking status to each student
    const studentsWithBookings = await Promise.all(
      students.map(async (student) => {
        const booking = await Booking.findOne({ studentId: student._id })
          .populate('classroomId', 'name code')
          .select('seatNumber classroomId');
        
        return {
          _id: student._id,
          name: student.name,
          enrollmentNo: student.enrollmentNo,
          email: student.email,
          dob: student.dob,
          plainPassword: student.plainPassword,
          assignedClassroom: student.assignedClassroom ? {
            _id: student.assignedClassroom._id,
            name: student.assignedClassroom.name,
            code: student.assignedClassroom.code
          } : null,
          createdAt: student.createdAt,
          booking: booking ? {
            classroomId: booking.classroomId._id,
            classroomName: booking.classroomId.name,
            seatNumber: booking.seatNumber,
          } : null,
        };
      })
    );

    res.json({ success: true, students: studentsWithBookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving students list' });
  }
});

// @desc    Search students by name or enrollment number
// @route   GET /api/admin/students/search
// @access  Private (Admin)
router.get('/students/search', async (req, res) => {
  const query = req.query.q || '';
  
  try {
    const students = await User.find({
      role: 'student',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { enrollmentNo: { $regex: query, $options: 'i' } },
      ],
    }).select('name enrollmentNo email');

    const results = await Promise.all(
      students.map(async (student) => {
        const booking = await Booking.findOne({ studentId: student._id })
          .populate('classroomId', 'name code')
          .select('seatNumber classroomId seatId');
        
        return {
          _id: student._id,
          name: student.name,
          enrollmentNo: student.enrollmentNo,
          email: student.email,
          booking: booking ? {
            bookingId: booking._id,
            classroomId: booking.classroomId._id,
            classroomName: booking.classroomId.name,
            classroomCode: booking.classroomId.code,
            seatId: booking.seatId,
            seatNumber: booking.seatNumber,
          } : null,
        };
      })
    );

    res.json({ success: true, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error searching students' });
  }
});

// @desc    Cancel a student's booking as admin
// @route   DELETE /api/admin/bookings/:id
// @access  Private (Admin)
router.delete('/bookings/:id', async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      // Try to find booking by seatId
      booking = await Booking.findOne({ seatId: req.params.id });
    }
    if (!booking) {
      // Try to find booking by studentId
      booking = await Booking.findOne({ studentId: req.params.id });
    }
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // 1. Mark seat as unbooked
    await Seat.updateOne(
      { _id: booking.seatId },
      { isBooked: false, bookedBy: null }
    );

    const studentId = booking.studentId.toString();

    // 2. Delete booking document
    await Booking.deleteOne({ _id: booking._id });

    // Send email if requested
    const student = await User.findById(studentId);
    const emailSetting = await Settings.findOne({ key: 'email_enabled' });
    const emailEnabled = emailSetting ? emailSetting.value === true : true;

    if (student && req.query.sendEmail === 'true' && emailEnabled) {
      const classroom = await Classroom.findById(booking.classroomId);
      const emailSubject = 'CodingGita - Seat Reservation Revoked';
      const emailText = `Hello ${student.name},\n\nYour seat booking for Seat ${booking.seatNumber} in ${classroom ? classroom.name : 'Classroom'} has been cancelled by the administrator.\n\nBest regards,\nCodingGita Admin Team`;
      const emailHtml = getGodLevelEmailTemplate(student, classroom, booking, 'cancel');
      sendEmailUtil({
        email: student.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        forceSend: true,
      }).catch(err => console.error('Error sending unbook email:', err.message));
    }

    // 3. Emit Socket.IO events for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Broadcast seat cancelled event to classroom room
      io.to(`classroom:${booking.classroomId}`).emit('seat:cancelled', {
        seatId: booking.seatId,
        seatNumber: booking.seatNumber,
      });

      // Notify the specific student that their booking was cancelled
      io.to(`student:${studentId}`).emit('student:booking-updated', {
        action: 'cancelled',
        message: 'Your booking has been cancelled by the administrator.',
      });

      // Broadcast global classroom stats update
      io.emit('classroom:update');
    }

    res.json({ success: true, message: 'Student booking successfully cancelled by admin' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error cancelling student booking' });
  }
});

// @desc    Get all students assigned to a classroom with booking details
// @route   GET /api/admin/classrooms/:classroomId/students
// @access  Private (Admin)
router.get('/classrooms/:classroomId/students', async (req, res) => {
  try {
    const { classroomId } = req.params;
    const students = await User.find({ role: 'student', assignedClassroom: classroomId })
      .select('name enrollmentNo email');
    
    const studentsWithBooking = await Promise.all(
      students.map(async (student) => {
        const booking = await Booking.findOne({ studentId: student._id })
          .populate('classroomId', 'name code')
          .select('seatNumber classroomId seatId');
        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          enrollmentNo: student.enrollmentNo,
          booking: booking ? {
            bookingId: booking._id,
            classroomId: booking.classroomId._id,
            classroomName: booking.classroomId.name,
            classroomCode: booking.classroomId.code,
            seatId: booking.seatId,
            seatNumber: booking.seatNumber,
          } : null,
        };
      })
    );
    res.json({ success: true, students: studentsWithBooking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving students list' });
  }
});

// @desc    Book a seat for a student as admin
// @route   POST /api/admin/bookings
// @access  Private (Admin)
router.post('/bookings', async (req, res) => {
  const { studentId, seatId, cancelPrevious, sendEmail } = req.body;

  if (!studentId || !seatId) {
    return res.status(400).json({ success: false, message: 'Please provide studentId and seatId' });
  }

  try {
    const seat = await Seat.findById(seatId);
    if (!seat) {
      return res.status(404).json({ success: false, message: 'Seat not found' });
    }
    if (seat.isBooked) {
      return res.status(400).json({ success: false, message: 'This seat is already booked.' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.assignedClassroom && student.assignedClassroom.toString() !== seat.classroomId.toString()) {
      return res.status(400).json({ success: false, message: 'Student is not assigned to this classroom.' });
    }

    const existingBooking = await Booking.findOne({ studentId });
    if (existingBooking) {
      if (!cancelPrevious) {
        return res.status(400).json({
          success: false,
          code: 'ALREADY_BOOKED',
          message: 'Student already has a booked seat.',
          existingBooking: {
            bookingId: existingBooking._id,
            seatNumber: existingBooking.seatNumber,
          }
        });
      } else {
        // Cancel the student's previous booking
        await Seat.updateOne(
          { _id: existingBooking.seatId },
          { isBooked: false, bookedBy: null }
        );
        await Booking.deleteOne({ _id: existingBooking._id });

        const io = req.app.get('io');
        if (io) {
          io.to(`classroom:${existingBooking.classroomId}`).emit('seat:cancelled', {
            seatId: existingBooking.seatId,
            seatNumber: existingBooking.seatNumber,
          });
          io.to(`student:${studentId}`).emit('student:booking-updated', {
            action: 'cancelled',
            message: `Your booking for Seat ${existingBooking.seatNumber} has been updated.`,
          });
        }
      }
    }

    // Atomically book the seat
    const updatedSeat = await Seat.findOneAndUpdate(
      { _id: seatId, isBooked: false, bookedBy: null },
      { isBooked: true, bookedBy: studentId },
      { new: true }
    );
    if (!updatedSeat) {
      return res.status(400).json({ success: false, message: 'This seat was already booked.' });
    }

    const booking = await Booking.create({
      studentId,
      classroomId: seat.classroomId,
      seatId: seat._id,
      seatNumber: seat.seatNumber,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`classroom:${seat.classroomId}`).emit('seat:booked', {
        seatId: seat._id,
        seatNumber: seat.seatNumber,
        studentName: student.name,
      });
      io.emit('classroom:update');
      io.to(`student:${studentId}`).emit('student:booking-updated', {
        action: 'booked',
        booking: {
          classroomId: seat.classroomId,
          seatNumber: seat.seatNumber,
        }
      });
    }

    const emailSetting = await Settings.findOne({ key: 'email_enabled' });
    const emailEnabled = emailSetting ? emailSetting.value === true : true;

    if (sendEmail && emailEnabled) {
      let password = generateRandomPassword();
      let passExists = await User.findOne({ plainPassword: password });
      while (passExists) {
        password = generateRandomPassword();
        passExists = await User.findOne({ plainPassword: password });
      }

      student.password = password;
      student.plainPassword = password;
      await student.save();

      const classroom = await Classroom.findById(seat.classroomId);
      const emailSubject = 'CodingGita - Seat Booking Confirmed!';
      const emailText = `Hello ${student.name},\n\nYour seat booking has been confirmed.\nClassroom: ${classroom ? classroom.name : 'Classroom'}\nSeat: ${seat.seatNumber}\n\nBest regards,\nCodingGita Admin Team`;
      const emailHtml = getGodLevelEmailTemplate(student, classroom, seat, 'booking');
      sendEmailUtil({
        email: student.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        forceSend: true,
      }).catch(err => console.error('Error sending booking email:', err.message));
    }

    res.status(201).json({ success: true, message: 'Seat successfully booked', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error booking seat' });
  }
});

// @desc    Reassign a booked seat to another student
// @route   PATCH /api/admin/bookings/:bookingId/reassign
// @access  Private (Admin)
router.patch('/bookings/:bookingId/reassign', async (req, res) => {
  const { bookingId } = req.params;
  const { studentId, cancelPrevious, sendEmail } = req.body;

  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Please provide studentId' });
  }

  try {
    let booking = await Booking.findById(bookingId);
    if (!booking) {
      booking = await Booking.findOne({ seatId: bookingId });
    }
    if (!booking) {
      booking = await Booking.findOne({ studentId: bookingId });
    }
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const newStudent = await User.findById(studentId);
    if (!newStudent || newStudent.role !== 'student') {
      return res.status(404).json({ success: false, message: 'New student not found.' });
    }

    if (newStudent.assignedClassroom && newStudent.assignedClassroom.toString() !== booking.classroomId.toString()) {
      return res.status(400).json({ success: false, message: 'Student is not assigned to this classroom.' });
    }

    const oldStudentId = booking.studentId.toString();

    const existingNewStudentBooking = await Booking.findOne({ studentId });
    if (existingNewStudentBooking) {
      if (!cancelPrevious) {
        return res.status(400).json({
          success: false,
          code: 'ALREADY_BOOKED',
          message: 'The selected student already has another seat booked.',
          existingBooking: {
            seatNumber: existingNewStudentBooking.seatNumber,
          }
        });
      } else {
        await Seat.updateOne(
          { _id: existingNewStudentBooking.seatId },
          { isBooked: false, bookedBy: null }
        );
        await Booking.deleteOne({ _id: existingNewStudentBooking._id });

        const io = req.app.get('io');
        if (io) {
          io.to(`classroom:${existingNewStudentBooking.classroomId}`).emit('seat:cancelled', {
            seatId: existingNewStudentBooking.seatId,
            seatNumber: existingNewStudentBooking.seatNumber,
          });
        }
      }
    }

    // Reassign seat
    await Seat.updateOne(
      { _id: booking.seatId },
      { bookedBy: studentId }
    );

    booking.studentId = studentId;
    await booking.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`student:${oldStudentId}`).emit('student:booking-updated', {
        action: 'cancelled',
        message: 'Your booking has been reassigned to another student by the administrator.',
      });

      io.to(`student:${studentId}`).emit('student:booking-updated', {
        action: 'booked',
        booking: {
          classroomId: booking.classroomId,
          seatNumber: booking.seatNumber,
        }
      });

      io.to(`classroom:${booking.classroomId}`).emit('seat:booked', {
        seatId: booking.seatId,
        seatNumber: booking.seatNumber,
        studentName: newStudent.name,
      });

      io.emit('classroom:update');
    }

    const emailSetting = await Settings.findOne({ key: 'email_enabled' });
    const emailEnabled = emailSetting ? emailSetting.value === true : true;

    if (sendEmail && emailEnabled) {
      let password = generateRandomPassword();
      let passExists = await User.findOne({ plainPassword: password });
      while (passExists) {
        password = generateRandomPassword();
        passExists = await User.findOne({ plainPassword: password });
      }

      newStudent.password = password;
      newStudent.plainPassword = password;
      await newStudent.save();

      const classroom = await Classroom.findById(booking.classroomId);
      const emailSubject = 'CodingGita - Seat Reassigned to You!';
      const emailText = `Hello ${newStudent.name},\n\nAn administrator has reassigned Seat ${booking.seatNumber} in ${classroom ? classroom.name : 'Classroom'} to you.\n\nBest regards,\nCodingGita Admin Team`;
      const emailHtml = getGodLevelEmailTemplate(newStudent, classroom, booking, 'reassign');
      sendEmailUtil({
        email: newStudent.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        forceSend: true,
      }).catch(err => console.error('Error sending reassignment email:', err.message));
    }

    res.json({ success: true, message: 'Seat successfully reassigned', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during reassignment' });
  }
});

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
router.get('/settings', async (req, res) => {
  try {
    const regSetting = await Settings.findOne({ key: 'registration_open' });
    const registrationOpen = regSetting ? regSetting.value === true : false;
    
    const bookingSetting = await Settings.findOne({ key: 'booking_open' });
    const bookingOpen = bookingSetting ? bookingSetting.value === true : false;

    const emailSetting = await Settings.findOne({ key: 'email_enabled' });
    const emailEnabled = emailSetting ? emailSetting.value === true : true;

    res.json({ success: true, settings: { registrationOpen, bookingOpen, emailEnabled } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
});

// @desc    Update system settings
// @route   POST /api/admin/settings
// @access  Private (Admin)
router.post('/settings', async (req, res) => {
  try {
    const { registrationOpen, bookingOpen, emailEnabled } = req.body;
    const updates = {};
    
    if (registrationOpen !== undefined) {
      if (typeof registrationOpen !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid value for registrationOpen' });
      }
      await Settings.findOneAndUpdate(
        { key: 'registration_open' },
        { value: registrationOpen },
        { upsert: true, new: true }
      );
      updates.registrationOpen = registrationOpen;
    }

    if (bookingOpen !== undefined) {
      if (typeof bookingOpen !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid value for bookingOpen' });
      }
      await Settings.findOneAndUpdate(
        { key: 'booking_open' },
        { value: bookingOpen },
        { upsert: true, new: true }
      );
      updates.bookingOpen = bookingOpen;
    }

    if (emailEnabled !== undefined) {
      if (typeof emailEnabled !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid value for emailEnabled' });
      }
      await Settings.findOneAndUpdate(
        { key: 'email_enabled' },
        { value: emailEnabled },
        { upsert: true, new: true }
      );
      updates.emailEnabled = emailEnabled;

      // Trigger background bulk credentials dispatch if set to ON (true)
      if (emailEnabled) {
        sendBulkCredentials().catch(err => console.error('Bulk email dispatch thread error:', err));
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('settings:update', updates);
    }

    res.json({ success: true, message: 'Settings successfully updated', settings: updates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating settings' });
  }
});

// @desc    Send login credentials email to a specific student
// @route   POST /api/admin/students/:studentId/send-credentials
// @access  Private (Admin)
router.post('/students/:studentId/send-credentials', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const emailSetting = await Settings.findOne({ key: 'email_enabled' });
    const emailEnabled = emailSetting ? emailSetting.value === true : true;
    if (!emailEnabled) {
      return res.status(400).json({ success: false, message: 'Email notifications are globally disabled in settings.' });
    }

    // Generate a fresh unique password
    let password = generateRandomPassword();
    let passExists = await User.findOne({ plainPassword: password });
    while (passExists) {
      password = generateRandomPassword();
      passExists = await User.findOne({ plainPassword: password });
    }

    student.password = password;
    student.plainPassword = password;
    await student.save();

    // Resolve classroom name for presentation
    let className = 'Unassigned';
    let classroom = null;
    if (student.assignedClassroom) {
      classroom = await Classroom.findById(student.assignedClassroom);
      className = classroom ? classroom.name : 'Classroom';
    }

    // Prepare booking details if they hold one
    const booking = await Booking.findOne({ studentId: student._id });

    // Send welcome/credentials email
    const emailSubject = 'Welcome to CodingGita - SeatSync Account Confirmed!';
    const emailText = `Hello ${student.name},\n\nYour student account login credentials for CodingGita SeatSync:\n - Portal Link: https://seat-booking-website-flax.vercel.app/login\n - Email Address: ${student.email}\n - Password: ${password}\n - Assigned Classroom: ${className}\n\nBest Regards,\nCodingGita Admin Team`;
    const emailHtml = getGodLevelEmailTemplate(student, classroom, booking || { seatNumber: 'N/A' }, 'booking');

    await sendEmailUtil({
      email: student.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      forceSend: true,
    });

    res.json({ success: true, message: `Credentials successfully sent to ${student.email}`, plainPassword: password });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error sending credentials email.' });
  }
});

// @desc    Get system login logs
// @route   GET /api/master/login-logs
// @access  Private (Admin)
router.get('/login-logs', async (req, res) => {
  try {
    const logs = await LoginLog.find()
      .populate('userId', 'name enrollmentNo role')
      .sort({ timestamp: -1 })
      .limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving login logs' });
  }
});

module.exports = router;
