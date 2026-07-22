require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const importData = async () => {
  await connectDB();

  try {
    console.log('Starting data migration...');

    // 1. Delete all existing bookings and reset seats
    console.log('Deleting existing bookings...');
    await Booking.deleteMany({});
    
    console.log('Resetting all seats...');
    await Seat.updateMany({}, { isBooked: false, bookedBy: null });

    // 2. Delete all users EXCEPT the two super admins
    console.log('Deleting existing users (excluding super admins)...');
    await User.deleteMany({ 
      email: { $nin: ['zeelkundariya13@gmail.com', 'kakkadrachit1@gmail.com'] }
    });

    // 3. Get Classroom IDs map
    const classrooms = await Classroom.find({});
    const classroomMap = {};
    classrooms.forEach(c => {
      classroomMap[c.name] = c._id;
    });
    console.log('Classroom Map:', classroomMap);

    // 4. Read new student data
    const dataPath = path.join(__dirname, '..', 'studentdata.json.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const newStudentsData = JSON.parse(rawData);

    // 5. Transform and Insert
    const usersToInsert = [];
    const seenEmails = new Set();
    const seenEnrolls = new Set();
    
    for (const item of newStudentsData) {
      const email = item['Email Address [Required]'].trim().toLowerCase();
      // Extract enrollment number from the email (e.g. SUK250054CE001)
      const enrollmentNo = email.split('@')[0].toUpperCase();
      
      // Safety check: Avoid duplicating entries from the JSON itself
      if (seenEmails.has(email) || seenEnrolls.has(enrollmentNo)) {
        console.warn(`Skipping duplicate in JSON: ${email} / ${enrollmentNo}`);
        continue;
      }
      seenEmails.add(email);
      seenEnrolls.add(enrollmentNo);

      const name = item['Name'].trim();
      const sectionName = `Classroom ${item['Section']}`;
      const classroomId = classroomMap[sectionName] || null;

      usersToInsert.push({
        name,
        email,
        enrollmentNo,
        password: 'OAUTH_USER', // Used for Google Auth
        role: 'student',
        assignedClassroom: classroomId,
        dob: null,
        plainPassword: null
      });
    }

    console.log(`Inserting ${usersToInsert.length} new students...`);
    await User.insertMany(usersToInsert);

    console.log('Data migration complete! Perfect setup achieved.');
    process.exit();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

importData();
