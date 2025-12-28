import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION } from '@/lib/constants';
import { Role } from '@/types';

// INTERFACE

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  loginAttempts: number;
  lockUntil?: Date;
  refreshTokens: Array<{
    token: string;
    expiresAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isLocked(): boolean;
}

// SCHEMA

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isActive: 1 });

// MIDDLEWARE

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Clean up expired refresh tokens before saving
UserSchema.pre('save', function () {
  if (this.isModified('refreshTokens')) {
    const now = new Date();
    this.refreshTokens = this.refreshTokens.filter(
      (token) => token.expiresAt > now
    );
  }
});

//  METHODS

// Compare password for login
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Increment login attempts - Using findByIdAndUpdate to avoid TypeScript issues
UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  const userId = this._id;

  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < new Date()) {
    await User.findByIdAndUpdate(userId, {
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }

  // Build update object
  const updates: any = { $inc: { loginAttempts: 1 } };

  // Lock account if max attempts reached
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCKOUT_DURATION) };
  }

  await User.findByIdAndUpdate(userId, updates);
};

// Reset login attempts after successful login
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await User.findByIdAndUpdate(this._id, {
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Check if account is locked
UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// EXPORT

let User: Model<IUser>;

try {
  // Try to retrieve existing model
  User = mongoose.model<IUser>('User');
} catch {
  // If model doesn't exist, create it
  User = mongoose.model<IUser>('User', UserSchema);
}

export default User;
