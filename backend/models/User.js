const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

function encrypt(text) {
  if (!text) return text;
  if (text.startsWith('ENC:')) return text;
  try {
    const iv = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'hex').slice(0, 16); 
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'), iv);
    let encrypted = cipher.update(text.toLowerCase()); // Lowercase for email consistency
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return 'ENC:' + encrypted.toString('hex');
  } catch(e) {
    return text;
  }
}

function decrypt(text) {
  if (!text || !text.startsWith('ENC:')) return text;
  try {
    const iv = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'hex').slice(0, 16);
    const encryptedText = Buffer.from(text.replace('ENC:', ''), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch(e) {
    return text;
  }
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    get: decrypt,
    set: encrypt
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
    get: decrypt,
    set: encrypt
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
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
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
