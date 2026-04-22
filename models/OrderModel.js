import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    commerceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commerce",
      required: true,
    },
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      required: false,
      default: null
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Addresses",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        image: {
          type: String,
          default: null,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    itbis: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pendiente", "en proceso", "completado"],
      default: "pendiente",
    },
  },
  {
    timestamps: true,
    collection: "Orders",
  }
);

const Orders = mongoose.model("Orders", orderSchema);

export default Orders;
