import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  email: String,
  studentId: String,
  name: String,
  department: String,
  year: String,
  subjectName: String,
  courseCode: String,
  courseType: String,
  coordinator: String,
  finalCode: String
}, { 
  strict: false, // Allows saving fields not defined above
  timestamps: true 
});

export default mongoose.model("Student", studentSchema);