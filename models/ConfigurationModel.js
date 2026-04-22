import mongoose from "mongoose";

const configurationSchema = new mongoose.Schema(
  {
    itbis: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "Configurations",
  },
);

const Configuration = mongoose.model("Configuration", configurationSchema);
export default Configuration;
