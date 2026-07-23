const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

// Ensure correct path to .env
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const testBooking = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // 1. Find a random student
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      console.log('No student found in the database to book for.');
      process.exit(1);
    }

    // 2. Find an empty seat in their assigned classroom
    const seat = await Seat.findOne({ 
      classroomId: student.assignedClassroom,
      isBooked: false 
    });

    if (!seat) {
      console.log('No available seats found for this student\'s classroom.');
      process.exit(1);
    }

    // 3. Mark the seat as booked
    seat.isBooked = true;
    seat.bookedBy = student._id;
    await seat.save();

    // 4. Create the booking with fake photo and geolocation
    const booking = await Booking.create({
      studentId: student._id,
      classroomId: seat.classroomId,
      seatId: seat._id,
      seatNumber: seat.seatNumber,
      // Fake Base64 Image (Tiny 1x1 black pixel)
      photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      ipAddress: '192.168.1.100',
      latitude: 23.0225, // Mock University Latitude
      longitude: 72.5714, // Mock University Longitude
      faceMatchStatus: true,
      faceConfidenceScore: 0.98, // 98% match!
      bookedAt: new Date()
    });

    console.log(`\n✅ SUCCESSFULLY BOOKED SEAT!`);
    console.log(`Student: ${student.name}`);
    console.log(`Seat: ${seat.seatNumber}`);
    console.log(`Coordinates: ${booking.latitude}, ${booking.longitude}`);
    console.log(`\nGo check your dashboard now!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test booking:', error);
    process.exit(1);
  }
};

testBooking();
