import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const mongoUri =
            process.env.MONGO_URI || `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

        await mongoose.connect(mongoUri);

        console.log("Db connected");
    } catch (ex) {
        console.error("Db connection error", ex);
        process.exit(1);
    }
};

export default connectDB;
