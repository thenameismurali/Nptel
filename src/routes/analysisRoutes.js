import express from "express";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import { setCachedResult, getCachedResult } from "../utils/analysisCache.js";

const router = express.Router();

/* ================= RUN ANALYSIS ================= */
router.post("/run-analysis", async (req, res) => {
  try {
    const students = await Student.find().lean();
    const courses = await Course.find().lean();

    if (!students.length) {
      return res.status(400).json({
        success: false,
        message: "No students found in database"
      });
    }

    const normalize = (code) =>
      (code || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s\-_]/g, "");

    /* ================= CREATE COURSE MAP ================= */
    const courseMap = new Map();

    courses.forEach(course => {
      const rawCode =
        course.courseId ||
        course["Current course ID"] ||
        "";

      const cleanCode = normalize(rawCode);

      if (cleanCode) {
        courseMap.set(cleanCode, course);
      }
    });

    const result = {
      counts: {
        emailIssues: 0,
        emailMismatch: 0,
        idIssues: 0,
        personalEmail: 0,
        invalidCourses: 0,
        courseValidation: 0,
        durationCheck: 0,
      },
      data: {
        emailIssues: [],
        emailMismatch: [],
        idIssues: [],
        personalEmail: [],
        invalidCourses: [],
        courseValidation: [],
        durationCheck: [],
      }
    };

    students.forEach(student => {
      const { _id, __v, createdAt, updatedAt, ...allData } = student;

      const email = (allData.email || "").trim().toLowerCase();
      const id = (allData.studentId || "").trim().toUpperCase();

      const finalCode =
        allData["New Code from Final data"] || "";

      allData["New Code from Final data"] = finalCode;

      const cleanStudentCode = normalize(finalCode);

      const emailRegex = /^n\d{6}@rguktn\.ac\.in$/i;
      const idRegex = /^N\d{6}$/i;

      /* ================= ID CHECK ================= */
      if (!id || !idRegex.test(id)) {
        result.counts.idIssues++;
        result.data.idIssues.push(allData);
      }

      /* ================= EMAIL CHECK ================= */
      const domain = email.split("@")[1] || "";

      if (domain && !domain.startsWith("rguktn.ac")) {
        result.counts.personalEmail++;
        result.data.personalEmail.push(allData);
      } else {
        if (!emailRegex.test(email)) {
          result.counts.emailIssues++;
          result.data.emailIssues.push(allData);
        }

        if (emailRegex.test(email) && idRegex.test(id)) {
          const emailNumber = email.substring(1, 7);
          const idNumber = id.substring(1, 7);
          if (emailNumber !== idNumber) {
            result.counts.emailMismatch++;
            result.data.emailMismatch.push(allData);
          }
        }
      }

      /* ================= INVALID COURSE FORMAT ================= */
      if (
        !cleanStudentCode ||
        cleanStudentCode === "nodatafound" ||
        cleanStudentCode === "nosubfound" ||
        !cleanStudentCode.startsWith("noc")
      ) {
        result.counts.invalidCourses++;
        result.data.invalidCourses.push(allData);
        return; // STOP further validation
      }

      /* ================= COURSE VALIDATION ================= */
      const rawCode = (finalCode || "")
  .toString()
  .trim()
  .toLowerCase();

const cleanedForCompare = rawCode.replace(/\s+/g, "");

const matchedCourse = courseMap.get(cleanStudentCode);

/* ================= STRICT COURSE VALIDATION ================= */
if (
  !rawCode ||                                   // empty
  cleanedForCompare === "" ||                   // whitespace
  cleanedForCompare === "nodatafound" ||        // special string
  cleanedForCompare === "nosubfound" ||         // special string
  !matchedCourse                                // not found in DB
) {
  result.counts.courseValidation++;
  result.data.courseValidation.push(allData);
  return; // STOP duration check
}

      /* ================= STRICT DURATION CHECK ================= */
      const durationRaw =
        matchedCourse.Duration ||
        matchedCourse.duration;

      if (
        !durationRaw ||
        durationRaw.toString().trim() === "" ||
        durationRaw.toString().toLowerCase() === "nodatafound" ||
        durationRaw.toString().toLowerCase() === "nosubfound"
      ) {
        result.counts.durationCheck++;
        result.data.durationCheck.push(allData);
        return;
      }

      const numbers = durationRaw.toString().match(/\d+/g) || [];
      const has12 = numbers.some(num => parseInt(num) === 12);

      if (!has12) {
        result.counts.durationCheck++;
        result.data.durationCheck.push(allData);
      }

    });

    setCachedResult(result);

    console.log("✅ Analysis completed successfully");
    console.log(
      "Total Errors:",
      Object.values(result.counts).reduce((a, b) => a + b, 0)
    );

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Analysis failed"
    });
  }
});

/* ================= FETCH RESULT ================= */
router.get("/student-errors", (req, res) => {
  const cachedResult = getCachedResult();

  if (!cachedResult) {
    return res.json({ counts: {}, data: {} });
  }

  res.json(cachedResult);
});

export default router;