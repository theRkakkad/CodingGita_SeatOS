const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const LOOKUP_SECRET = process.env.LOOKUP_SECRET || 'fallback_lookup_secret_for_hmac_123';
const getEmailHash = (email) => crypto.createHmac('sha256', LOOKUP_SECRET).update(email.toLowerCase()).digest('hex');

const Classroom = require('../models/Classroom');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const sendEmail = require('../utils/sendEmail');

// Helper to generate 8-character unique random password
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

const seedStudents = async (shouldExit = false) => {
  try {
    const jsonPath = path.join(__dirname, '../studentsdata.json.json');

    if (!fs.existsSync(jsonPath)) {
      console.error(`Error: real student data file not found at ${jsonPath}`);
      if (shouldExit) process.exit(1);
      return;
    }

    // Read students from file
    const students = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Loaded ${students.length} students from studentsdata.json.json.`);

    // 2. Connect to Database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log('Connected to MongoDB database...');

    // Extract all real emails to clean up dummy accounts
    const realEmails = students
      .filter(s => s["EMAIL ID"])
      .map(s => s["EMAIL ID"].trim().toLowerCase());

    // Clean up only dummy student accounts (whose emails are not in the real file)
    console.log('Cleaning up obsolete dummy student accounts...');
    const deleteUsersResult = await User.deleteMany({
      role: 'student',
      email: { $nin: realEmails }
    });
    console.log(`Deleted ${deleteUsersResult.deletedCount} dummy student accounts.`);

    // 3. Resolve Classrooms
    const classroom1 = await Classroom.findOne({ code: 'CLASSROOM_702' });
    const classroom2 = await Classroom.findOne({ code: 'CLASSROOM_714' });

    if (!classroom1 || !classroom2) {
      console.error('Classrooms (CLASSROOM_702, CLASSROOM_714) must be seeded first! Please run seed.js.');
      if (shouldExit) process.exit(1);
      return;
    }

    // 4. Seed/Verify Students
    let createdCount = 0;
    let updatedCount = 0;

    for (const student of students) {
      const email = student["EMAIL ID"];
      if (!email) continue;

      const emailLower = email.trim().toLowerCase();
      const section = String(student.Section).trim();

      let classroomId = null;
      if (section === '702') {
        classroomId = classroom1._id;
      } else if (section === '714') {
        classroomId = classroom2._id;
      }

      let user = await User.findOne({ emailLookupHash: getEmailHash(emailLower) });
      if (!user) {
        // Generate a new unique password
        let password = generateRandomPassword();
        let passExists = await User.findOne({ plainPassword: password });
        while (passExists) {
          password = generateRandomPassword();
          passExists = await User.findOne({ plainPassword: password });
        }

        // Create new student with unique password
        await User.create({
          name: student.NAME ? student.NAME.trim() : 'Unknown Student',
          email: emailLower,
          password: password, // automatic pre-save hash
          plainPassword: password, // Store plain text for admin view!
          enrollmentNo: student.GR ? String(student.GR).trim() : `EN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          assignedClassroom: classroomId,
          dob: student.DOB ? String(student.DOB).trim() : null,
          role: 'student',
        });
        createdCount++;

        // Send Welcome email with unique credentials
        const className = section === '702' ? 'Classroom 702' : 'Classroom 714';
        const emailSubject = 'Welcome to CodingGita - SeatSync Account Confirmed!';
        const emailText = `Hello ${student.NAME},\n\nYour student account has been created successfully for the CodingGita SeatSync Seat Booking portal.\n\nHere are your login credentials:\n - Login Link: https://seat-booking-website-flax.vercel.app/login\n - Email Address: ${emailLower}\n - Password: ${password}\n - Assigned Classroom: ${className}\n\nBest Regards,\nCodingGita Admin Team`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fafbfc;">
            <h2 style="color: #4e55fa; margin-top: 0;">Welcome to CodingGita SeatSync!</h2>
            <p>Hello <strong>${student.NAME}</strong>,</p>
            <p>Your student account has been created successfully for the classroom seat booking portal.</p>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Access Details:</strong></p>
              <p style="margin: 0 0 6px 0;">🔗 <strong>Login Link:</strong> <a href="https://seat-booking-website-flax.vercel.app/login" style="color: #4e55fa; text-decoration: none;">SeatSync Portal</a></p>
              <p style="margin: 0 0 6px 0;">📧 <strong>Email Address:</strong> ${emailLower}</p>
              <p style="margin: 0 0 6px 0;">🔑 <strong>Password:</strong> <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${password}</code></p>
              <p style="margin: 0;">🏫 <strong>Assigned Classroom:</strong> ${className}</p>
            </div>
            <p style="font-size: 12px; color: #718096; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
              This is an automated message. Please do not reply directly to this email.
            </p>
          </div>
        `;

        sendEmail({
          email: emailLower,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        }).catch((err) => console.error(`Error sending email to ${emailLower}:`, err.message));
      } else {
        // Upgrade default password to unique one if still set to codinggita123
        if (user.plainPassword === 'codinggita123' || !user.plainPassword) {
          let password = generateRandomPassword();
          let passExists = await User.findOne({ plainPassword: password });
          while (passExists) {
            password = generateRandomPassword();
            passExists = await User.findOne({ plainPassword: password });
          }
          user.password = password;
          user.plainPassword = password;
        }

        // Update properties safely without changing the unique password
        user.name = student.NAME ? student.NAME.trim() : user.name;
        user.enrollmentNo = student.GR ? String(student.GR).trim() : user.enrollmentNo;
        user.dob = student.DOB ? String(student.DOB).trim() : user.dob;
        user.assignedClassroom = classroomId;

        await user.save();
        updatedCount++;
      }
    }

    console.log(`\nSeeding completed successfully!`);
    console.log(` - Created new student accounts: ${createdCount}`);
    console.log(` - Verified/updated existing student accounts: ${updatedCount}`);
    if (shouldExit) process.exit(0);
  } catch (error) {
    console.error('Error seeding student list:', error);
    if (shouldExit) process.exit(1);
  }
};

if (require.main === module) {
  seedStudents(true);
}

module.exports = seedStudents;
