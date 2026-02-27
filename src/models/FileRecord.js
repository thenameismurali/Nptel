import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  fileName: String,
  fileType: String, // student or course
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("FileRecord", fileSchema);