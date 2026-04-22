import mongoose from "mongoose";
import { Roles } from "../utils/enums/roles.js";

const commerceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
  role: {
    type: String,
    enum: [Roles.COMMERCE],
    default: Roles.COMMERCE,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false,
    required: true
  },
  activateToken: {
    type: String,
    default: null
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiration: {
    type: Date,
    default: null
  },
  openingTime: {
    type: String,
    required: true
  },
  closingTime: {
    type: String,
    required: true
  },
  commerceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CommerceType",
    required: true
  }
}, {
  timestamps: true,
  collection: "Commerces"
});

commerceSchema.pre("validate", function () {
  this.role = Roles.COMMERCE;
});

const Commerce = mongoose.model("Commerce", commerceSchema);
export default Commerce;
