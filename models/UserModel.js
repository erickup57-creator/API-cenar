import mongoose from "mongoose";
import { Roles } from "../utils/enums/roles.js";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    trim: true,
    required: function () {
      return this.role !== Roles.COMMERCE;
    }
  },
  username: {
    type: String,
    unique: true,
    sparse: true,     
    trim: true,
    required: function () {
      return this.role !== Roles.COMMERCE;
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  profileImage: {
    type: String
  },
  cedula: {
    type: String,
    trim: true,
    required: function () {
      return this.role === Roles.ADMIN;
    }
  },

  role: {
    type: String,
    enum: Object.values(Roles),
    required: true
  },

  isActive: {
    type: Boolean,
    default: false,
    required: true
  },

  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiration: {
    type: Date,
    default: null
  },
  activateToken: {
    type: String,
    default: null
  },

  deliveryStatus: {
    type: String,
    enum: ["disponible", "ocupado"],
    default: "disponible",
    required: function () {
      return this.role === Roles.DELIVERY;
    }
  },

  openingTime: {
    type: String,
    required: function () {
      return this.role === Roles.COMMERCE;
    }
  },
  closingTime: {
    type: String,
    required: function () {
      return this.role === Roles.COMMERCE;
    }
  },
  commerceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CommerceType",
    required: function () {
      return this.role === Roles.COMMERCE;
    }
  }
}, {
  timestamps: true,
  collection: "Users"
});

const Users = mongoose.model("Users", userSchema);
export default Users;