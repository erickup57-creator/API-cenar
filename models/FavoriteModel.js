import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true
    },
    commerceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commerce",
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: "Favorites"
  }
);

favoriteSchema.index({ userId: 1, commerceId: 1 }, { unique: true });

const Favorite = mongoose.model("Favorite", favoriteSchema);

export default Favorite;
