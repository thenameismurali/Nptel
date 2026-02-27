import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import uploadRoutes from "./src/routes/upload.js";
import fileRoutes from "./src/routes/fileRoutes.js";
import analysisRoutes from "./src/routes/analysisRoutes.js";
import emailRoutes from "./src/routes/emailRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", uploadRoutes);
app.use("/api", fileRoutes);
app.use("/api", analysisRoutes);
app.use("/api",emailRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

app.listen(5000, () => console.log("Server running on port 5000"));