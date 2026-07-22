const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Classroom = require('../models/Classroom');
const Seat = require('../models/Seat');
const User = require('../models/User');

const seedData = async (shouldExit = false) => {
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log('Connected to database for seeding...');

    // Clean up old obsolete classrooms if present
    const oldClassrooms = await Classroom.find({ code: { $in: ['CLASSROOM_1', 'CLASSROOM_2', 'CLASSROOM_704'] } });
    if (oldClassrooms.length > 0) {
      const oldIds = oldClassrooms.map(c => c._id);
      await Seat.deleteMany({ classroomId: { $in: oldIds } });
      await Classroom.deleteMany({ _id: { $in: oldIds } });
      console.log('Cleaned up old classrooms & seats.');
    }

    // 1. Seed Classrooms
    const classroomsToSeed = [
      {
        name: 'Classroom 702',
        code: 'CLASSROOM_702',
        rows: 6,
        seatsPerRow: 9,
        totalSeats: 54,
      },
      {
        name: 'Classroom 714',
        code: 'CLASSROOM_714',
        rows: 6,
        seatsPerRow: 12,
        totalSeats: 64, // 12*4 (A,B,C,D) + 9 (E) + 7 (F) = 64 seats
      },
    ];

    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    for (const classData of classroomsToSeed) {
      let classroom = await Classroom.findOne({ code: classData.code });
      if (!classroom) {
        classroom = await Classroom.create(classData);
        console.log(`Created classroom: ${classroom.name}`);
      } else {
        // Update configuration if changed
        if (classroom.rows !== classData.rows || classroom.totalSeats !== classData.totalSeats) {
          classroom.rows = classData.rows;
          classroom.seatsPerRow = classData.seatsPerRow;
          classroom.totalSeats = classData.totalSeats;
          await classroom.save();
          console.log(`Updated configuration for classroom ${classroom.name}.`);
        }
        console.log(`Classroom ${classroom.name} already exists. Skipping classroom creation.`);
      }

      // Clean up any outdated seats (e.g. if rows decreased, remove G row seats)
      const validRowLetters = rowLetters.slice(0, classroom.rows);
      const deleteResult = await Seat.deleteMany({ 
        classroomId: classroom._id, 
        row: { $nin: validRowLetters } 
      });
      if (deleteResult.deletedCount > 0) {
        console.log(`Deleted ${deleteResult.deletedCount} outdated seats for ${classroom.name}.`);
      }

      // Additional cleanups for Classroom 714 custom asymmetrical rows (Row E till 9, Row F till 7)
      if (classroom.code === 'CLASSROOM_714') {
        const eDelete = await Seat.deleteMany({ classroomId: classroom._id, row: 'E', seatIndex: { $gt: 9 } });
        const fDelete = await Seat.deleteMany({ classroomId: classroom._id, row: 'F', seatIndex: { $gt: 7 } });
        if (eDelete.deletedCount > 0 || fDelete.deletedCount > 0) {
          console.log(`Deleted ${eDelete.deletedCount + fDelete.deletedCount} custom outdated seats for Classroom 714.`);
        }
      }

      // Generate seats for this classroom
      const existingSeatsCount = await Seat.countDocuments({ classroomId: classroom._id });
      if (existingSeatsCount === classroom.totalSeats) {
        console.log(`Seats for ${classroom.name} already fully seeded (${existingSeatsCount}/${classroom.totalSeats}).`);
        continue;
      }

      console.log(`Seeding seats for ${classroom.name}...`);
      const seats = [];
      for (let r = 0; r < classroom.rows; r++) {
        const rowLetter = rowLetters[r];
        for (let s = 1; s <= classroom.seatsPerRow; s++) {
          // Custom skip rules for Classroom 714 asymmetrical rows
          if (classroom.code === 'CLASSROOM_714') {
            if (rowLetter === 'E' && s > 9) continue; // Row E ends at E9
            if (rowLetter === 'F' && s > 7) continue; // Row F ends at F7
          }

          const seatNumber = `${rowLetter}${s}`;
          seats.push({
            seatNumber,
            row: rowLetter,
            seatIndex: s,
            classroomId: classroom._id,
            isBooked: false,
            bookedBy: null,
          });
        }
      }

      // Bulk write seats to avoid duplicate keys and make it fast
      for (const seat of seats) {
        await Seat.findOneAndUpdate(
          { classroomId: seat.classroomId, seatNumber: seat.seatNumber },
          { $setOnInsert: seat },
          { upsert: true, new: true }
        );
      }
      console.log(`Seats seeded/verified for ${classroom.name}.`);
    }

    // 2. Seed Default Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@seatsync.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'SeatSync Admin',
        enrollmentNo: 'ADMIN01',
        email: adminEmail,
        password: adminPassword, // Will be hashed automatically by pre-save middleware
        role: 'admin',
      });
      console.log(`Default admin user seeded: ${adminEmail}`);
    } else {
      // If admin exists, update credentials if custom ones are specified in env
      if (process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD) {
        if (process.env.ADMIN_EMAIL) admin.email = adminEmail;
        if (process.env.ADMIN_PASSWORD) admin.password = adminPassword;
        await admin.save();
        console.log(`Admin user credentials updated from env settings.`);
      } else {
        console.log(`Admin user already exists. Skipping.`);
      }
    }

    console.log('Seeding process completed successfully!');
    if (shouldExit) process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    if (shouldExit) process.exit(1);
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = seedData;
