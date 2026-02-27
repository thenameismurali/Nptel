import fs from "fs";
import csv from "csv-parser";
import Course from "../models/Course.js";

export const validateCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "CSV file required" });

    // 1. Fetch all courses from the collection (lean for performance)
    const courses = await Course.find().lean();

    // 2. Build a Normalized Map
    // We strip spaces, dashes, and underscores to handle inconsistencies
    const courseMap = new Map();
    
    courses.forEach(course => {
      // Priority: "Current course ID" contains the 2026 codes in your Compass import
      const rawId = course["Current course ID"] || course["Course ID"] || course.courseId || "";
      
      if (rawId) {
        // Normalization: removes spaces (\s), dashes (-), and underscores (_)
        const masterKey = rawId.toString().toLowerCase().replace(/[\s\-_]/g, "");
        courseMap.set(masterKey, course);
      }
    });

    const departmentWise = {};
    let rowNumber = 1;
    const stream = fs.createReadStream(req.file.path).pipe(csv());

    stream.on("data", (row) => {
      const emailErrors = [];
      const courseErrors = [];
      
      // Get department from the student CSV
      const department = row["Department"]?.trim() || "Unknown";

      // =========================
      // 🔹 EMAIL VALIDATION
      // =========================
      const emailRaw = row["NPTEL Registered email ID"]?.trim() || "";
      if (!emailRaw) {
        emailErrors.push("Email is missing");
      } else if (!emailRaw.toLowerCase().endsWith("@rguktn.ac.in")) {
        emailErrors.push("Personal mail entered");
      }

      // =========================
      // 🔹 COURSE VALIDATION (SYMBOL AGNOSTIC)
      // =========================
      const rawStudentCode = row["New Code from Final data"] || row["finalCode"] || "";
      const csvSubjectName = row["NPTEL Subject Name"]?.trim() || "";
      
      // Normalize student input: "noc26 - ch44" -> "noc26ch44"
      const normalizedStudentCode = rawStudentCode.toString().toLowerCase().replace(/[\s\-_]/g, "");

      if (!normalizedStudentCode) {
        courseErrors.push("Course Code missing in student file");
      } 
      // Look up using the clean key against our Map
      else if (!courseMap.has(normalizedStudentCode)) {
        courseErrors.push(`Invalid Course Code: ${rawStudentCode} (Not found in Master List)`);
      } 
      else {
        const dbCourse = courseMap.get(normalizedStudentCode);
        
        // Manual Compass import creates headers with spaces
        const dbCourseName = dbCourse["Course Name"] || dbCourse.courseName || "";

        if (dbCourseName.trim().toLowerCase() !== csvSubjectName.toLowerCase()) {
          courseErrors.push(`Subject Name mismatch (Found in DB: "${dbCourseName}")`);
        }
      }

      // =========================
      // 🔹 STORE ERRORS BY DEPARTMENT
      // =========================
      if (emailErrors.length > 0 || courseErrors.length > 0) {
        if (!departmentWise[department]) {
          departmentWise[department] = { 
            totalRowsWithErrors: 0, 
            emailErrors: [], 
            courseErrors: [] 
          };
        }
        departmentWise[department].totalRowsWithErrors++;
        
        if (emailErrors.length > 0) {
          departmentWise[department].emailErrors.push({ rowNumber, emailErrors });
        }
        if (courseErrors.length > 0) {
          departmentWise[department].courseErrors.push({ rowNumber, courseErrors });
        }
      }
      rowNumber++;
    });

    stream.on("end", () => {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ 
        success: true, 
        totalRowsProcessed: rowNumber - 1, 
        departmentWise 
      });
    });

    stream.on("error", (err) => next(err));

  } catch (error) { 
    next(error); 
  }
};