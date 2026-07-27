const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

const LOOKUP_SECRET = process.env.LOOKUP_SECRET || 'fallback_lookup_secret_for_hmac_123';

function encrypt(text) {
  if (!text) return text;
  if (text.startsWith('ENC:')) return text;
  try {
    const iv = crypto.randomBytes(12); // GCM standard IV size
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'), iv);
    let encrypted = cipher.update(text.toLowerCase());
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: ENC:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
    return `ENC:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch(e) {
    console.error('Encryption error:', e);
    return text;
  }
}

function decrypt(text) {
  if (!text || !text.startsWith('ENC:')) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 4) return text;
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedText = Buffer.from(parts[3], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch(e) {
    console.error('Decryption error:', e);
    return text; // Fallback to raw text if decryption fails (or throw)
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
    trim: true,
    get: decrypt,
    set: encrypt
  },
  emailLookupHash: {
    type: String,
    unique: true,
    sparse: true,
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

// Pre-save hook
userSchema.pre('save', async function (next) {
  if (this.isModified('email') || this.isNew) {
    if (this.email) {
      this.emailLookupHash = crypto.createHmac('sha256', LOOKUP_SECRET)
        .update(this.email.toLowerCase()).digest('hex');
    }
  }

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
