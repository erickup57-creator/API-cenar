import { projectRoot } from "./Paths.js";
import path from "path";
import dotenv from "dotenv";

const envPath = path.join(
  projectRoot,
  `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ""}`
);

// load environment variables from the .env file
dotenv.config({ path: envPath });
