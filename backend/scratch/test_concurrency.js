const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

const testConcurrency = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for concurrency testing...');

    // 1. Clean up old test data if any
    await User.deleteMany({ email: { $in: ['concur1@test.com', 'concur2@test.com'] } });
    await Booking.deleteMany({ seatNumber: 'A9', classroomId: { $exists: true } }); // Clean target test seat booking

    // 2. Create two test students
    console.log('Creating two test students...');
    const studentA = await User.create({
      name: 'Test Student A',
      enrollmentNo: 'CONCUR001',
      email: 'concur1@test.com',
      password: 'password123',
    });

    const studentB = await User.create({
      name: 'Test Student B',
      enrollmentNo: 'CONCUR002',
      email: 'concur2@test.com',
      password: 'password123',
    });

    // 3. Find target seat (Classroom 1, Seat A9)
    const targetSeat = await Seat.findOne({ seatNumber: 'A9' });
    if (!targetSeat) {
      throw new Error('Target seat A9 not found. Make sure you ran the seed script first!');
    }

    // Ensure seat is unbooked
    await Seat.updateOne(
      { _id: targetSeat._id },
      { isBooked: false, bookedBy: null }
    );

    console.log(`Target seat ${targetSeat.seatNumber} is currently unbooked.`);
    console.log('Simulating simultaneous concurrent booking requests...');

    // 4. Fire simultaneous atomic updates
    const requestA = Seat.findOneAndUpdate(
      { _id: targetSeat._id, isBooked: false, bookedBy: null },
      { isBooked: true, bookedBy: studentA._id },
      { new: true }
    );

    const requestB = Seat.findOneAndUpdate(
      { _id: targetSeat._id, isBooked: false, bookedBy: null },
      { isBooked: true, bookedBy: studentB._id },
      { new: true }
    );

    const [resA, resB] = await Promise.all([requestA, requestB]);

    console.log('\n--- Concurrency Test Results ---');
    console.log('Student A reservation result:', resA ? 'SUCCESS (Seat reserved)' : 'FAILED (Seat already taken)');
    console.log('Student B reservation result:', resB ? 'SUCCESS (Seat reserved)' : 'FAILED (Seat already taken)');

    // 5. Verification
    const finalSeat = await Seat.findById(targetSeat._id);
    if ((resA && !resB) || (!resA && resB)) {
      console.log('\nSUCCESS: Database atomic operations successfully prevented double booking!');
      console.log(`Seat is currently booked by: ${finalSeat.bookedBy.toString() === studentA._id.toString() ? 'Student A' : 'Student B'}`);
    } else if (resA && resB) {
      console.log('\nFAILURE: Race condition occurred! Both requests reported success.');
    } else {
      console.log('\nERROR: Neither request succeeded.');
    }

    // 6. Clean up test users and restore seat state
    console.log('\nCleaning up test data...');
    await User.deleteMany({ _id: { $in: [studentA._id, studentB._id] } });
    await Seat.updateOne(
      { _id: targetSeat._id },
      { isBooked: false, bookedBy: null }
    );
    console.log('Cleanup finished.');

    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
};

testConcurrency();
