const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const User = require('../models/User');

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const removeTestBooking = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find Abdul Haque
    const student = await User.findOne({ name: 'ABDUL HAQUE' });
    if (!student) {
        console.log("Could not find Abdul Haque.");
        process.exit(1);
    }

    // Find the test booking
    const booking = await Booking.findOne({ studentId: student._id });
    if (!booking) {
        console.log("No test booking found for Abdul Haque.");
        process.exit(0);
    }

    // Unbook the seat
    const seat = await Seat.findById(booking.seatId);
    if (seat) {
        seat.isBooked = false;
        seat.bookedBy = null;
        await seat.save();
        console.log(`Freed seat ${seat.seatNumber}`);
    }

    // Delete the booking
    await Booking.deleteOne({ _id: booking._id });
    console.log("Test booking successfully deleted!");

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

removeTestBooking();
