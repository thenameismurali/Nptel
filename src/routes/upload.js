import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import FileRecord from "../models/FileRecord.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/* ================= STUDENT UPLOAD ================= */
router.post("/upload-students", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const students = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        const cleanedRow = {};

        // 1. DYNAMIC CAPTURE: Trim headers and save EVERYTHING from the CSV row
        Object.keys(row).forEach((key) => {
          cleanedRow[key.trim()] = row[key]?.trim() || "";
        });

        // 2. MAPPING CRITICAL FIELDS: Ensure common variations are caught
        const studentId = cleanedRow["Student ID"] || cleanedRow["Student Id"] || cleanedRow["studentId"] || "";
        const finalCode = cleanedRow["New Code from Final data"] || cleanedRow["finalCode"] || cleanedRow["Final Code"] || "";
        const email = cleanedRow["NPTEL Registered email ID"] || cleanedRow["email"] || "";

        students.push({
          ...cleanedRow, // This saves ALL extra columns (Discipline, Department, etc.)
          studentId: studentId,
          finalCode: finalCode, // Keeps symbols exactly as is
          email: email
        });
      })
      .on("end", async () => {
        try {
          // Clear current students if you want a fresh list each time
          // await Student.deleteMany({}); 

          await Student.insertMany(students);

          await FileRecord.create({
            fileName: req.file.originalname,
            fileType: "student"
          });

          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

          res.json({ success: true, inserted: students.length });
        } catch (dbErr) {
          res.status(500).json({ message: "Database error: " + dbErr.message });
        }
      })
      .on("error", (err) => {
        res.status(500).json({ message: "CSV parsing error" });
      });

  } catch (err) {
    res.status(500).json({ message: "Student upload failed" });
  }
});

/* ================= COURSE UPLOAD ================= */
router.post("/upload-courses", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const courses = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        const cleanedRow = {};
        
        // 1. DYNAMIC CAPTURE: Trim headers and capture EVERY column (Discipline, SME, etc.)
        Object.keys(row).forEach((key) => {
          cleanedRow[key.trim()] = row[key]?.trim() || "";
        });

        // 2. SMART IDENTIFICATION: Find the ID regardless of CSV header format
        const courseId = 
          cleanedRow["Course ID"] || 
          cleanedRow["courseId"] || 
          cleanedRow["Current course ID"] || 
          "";

        // 3. STORE COMPLETE OBJECT: Symbols (noc26-ae01) are preserved
        courses.push({
          ...cleanedRow, 
          courseId: courseId,
          duration: cleanedRow["Duration"] || ""
        });
      })
      .on("end", async () => {
        try {
          // IMPORTANT: Clear the master list first to prevent old underscore-data from staying
          await Course.deleteMany({}); 
          
          await Course.insertMany(courses);

          await FileRecord.create({
            fileName: req.file.originalname,
            fileType: "course"
          });

          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

          res.json({ success: true, inserted: courses.length });
        } catch (dbErr) {
          res.status(500).json({ message: "Database error: " + dbErr.message });
        }
      })
      .on("error", (err) => {
        res.status(500).json({ message: "CSV parsing error" });
      });

  } catch (err) {
    res.status(500).json({ message: "Course upload failed" });
  }
});

export default router;