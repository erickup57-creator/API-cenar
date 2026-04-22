import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    commerceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commerce",
      required: true,
      index: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
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
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    image: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: "Products"
  }
);

productSchema.index({ commerceId: 1, categoryId: 1 });

const Product = mongoose.model("Products", productSchema);

export default Product;
