import mongoose from "mongoose";
import { Roles } from "../utils/enums/roles.js";

const deliverySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
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
      enum: [Roles.DELIVERY],
      default: Roles.DELIVERY,
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
    deliveryStatus: {
      type: String,
      enum: ["disponible", "ocupado"],
      default: "disponible",
      required: true
    }
  },
  {
    timestamps: true,
    collection: "Deliveries"
  }
);

deliverySchema.pre("validate", function () {
  this.role = Roles.DELIVERY;
});

const Delivery = mongoose.model("Delivery", deliverySchema);
export default Delivery;
