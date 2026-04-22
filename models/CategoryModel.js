import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    commerceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commerce",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: "Categories"
  }
);

categorySchema.index({ commerceId: 1, name: 1 }, { unique: true });

const Category = mongoose.model("Category", categorySchema);

export default Category;
