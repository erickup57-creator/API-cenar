import mongoose from "mongoose";

const commerceTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: "CommerceTypes"
});

const CommerceType = mongoose.model("CommerceType", commerceTypeSchema);
export default CommerceType;