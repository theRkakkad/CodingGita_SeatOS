const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  enrollmentNo: {
    type: String,
    unique: true,
    trim: true,
    sparse: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false, // Prevents returning password by default
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'info_admin'],
    default: 'student',
  },
  assignedClassroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    default: null,
  },
  dob: {
    type: String,
    default: null,
  },
  plainPassword: {
    type: String,
    default: null,
  },
  credentialsSent: {
    type: Boolean,
    default: false,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Encrypt password using bcryptjs
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
