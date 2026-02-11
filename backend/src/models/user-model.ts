import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

// User interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "admin" | "user";
  githubToken?: string;
  gitlabToken?: string;
  preferences: {
    defaultBranch: string;
    autoSync: boolean;
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
}

// User preferences schema
const userPreferencesSchema = new Schema(
  {
    defaultBranch: {
      type: String,
      default: "main",
    },
    autoSync: {
      type: Boolean,
      default: false,
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },
  },
  { _id: false }
);

// User schema
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password in queries by default
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    githubToken: {
      type: String,
      select: false, // Don't include token in queries by default
    },
    gitlabToken: {
      type: String,
      select: false, // Don't include token in queries by default
    },
    preferences: {
      type: userPreferencesSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete ret["password"];
        delete ret["githubToken"];
        delete ret["gitlabToken"];
        delete ret["__v"];
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash password if it's been modified
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods["comparePassword"] = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this["password"]);
  } catch (error) {
    return false;
  }
};

// Instance method to generate auth token (placeholder)
userSchema.methods["generateAuthToken"] = function (): string {
  // This will be implemented when we add JWT functionality
  return "token-placeholder";
};

// Static method to find user by email
userSchema.statics["findByEmail"] = function (email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set("toJSON", { virtuals: true });

export const User = mongoose.model<IUser>("User", userSchema);
