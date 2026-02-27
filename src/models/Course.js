import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  courseId: String, // We keep this for indexing
}, { 
  timestamps: true, 
  strict: false  // IMPORTANT: Allows all CSV columns to be saved
});

export default mongoose.model("Course", courseSchema);