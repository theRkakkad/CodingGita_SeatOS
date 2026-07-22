const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Seat = require('../models/Seat');

const cloudUri = 'mongodb+srv://admin:adminpassword123@cluster0.2ddihey.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const cleanup = async () => {
  try {
    console.log('Connecting to cloud database...');
    await mongoose.connect(cloudUri);
    console.log('Connected!');

    // Find Classroom 2
    const classroom = await Classroom.findOne({ code: 'CLASSROOM_2' });
    if (!classroom) {
      console.log('Classroom 2 not found!');
      process.exit(1);
    }
    console.log(`Found Classroom 2 with ID: ${classroom._id}`);
    console.log(`Current configuration - Rows: ${classroom.rows}, Seats: ${classroom.totalSeats}`);

    // Update Classroom 2 configurations directly
    classroom.rows = 6;
    classroom.totalSeats = 72;
    await classroom.save();
    console.log('Updated Classroom 2 configuration to 6 rows / 72 seats in the database.');

    // Count seats before deletion
    const totalSeatsCount = await Seat.countDocuments({ classroomId: classroom._id });
    const gSeatsCount = await Seat.countDocuments({ classroomId: classroom._id, row: 'G' });
    console.log(`Total seats in database for Classroom 2: ${totalSeatsCount}`);
    console.log(`G row seats count: ${gSeatsCount}`);

    // Delete G row seats
    const deleteResult = await Seat.deleteMany({ classroomId: classroom._id, row: 'G' });
    console.log(`Deleted ${deleteResult.deletedCount} seats belonging to Row G.`);

    const afterSeatsCount = await Seat.countDocuments({ classroomId: classroom._id });
    console.log(`Total seats for Classroom 2 after deletion: ${afterSeatsCount}`);

    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanup();
