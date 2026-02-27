import express from "express";
import Student from "../models/Student.js";
import Course from "../models/Course.js";

const router = express.Router();

router.get("/student-errors", async (req, res) => {
  try {
    const students = await Student.find().lean();
    const courses = await Course.find().lean();

    /* ================= NORMALIZER ================= */
    const normalize = (value) =>
      (value || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s\-_]/g, "");

    /* ================= CREATE COURSE MAP ================= */
    const courseMap = new Map();

    courses.forEach(course => {
      const rawId =
        course["Current course ID"] ||
        course.courseId ||
        "";

      const cleanId = normalize(rawId);
      if (cleanId) {
        courseMap.set(cleanId, course);
      }
    });

    const emailIssues = [];
    const emailMismatch = [];
    const idIssues = [];
    const personalEmail = [];
    const invalidCourses = [];
    const courseValidation = [];
    const durationCheck = [];

    students.forEach((student) => {

      const email = student.email ?? "";
      const studentId = student.studentId ?? "";
      const studentCodeRaw =
        student["New Code from Final data"] || "";

      const emailLower = email.trim().toLowerCase();
      const idUpper = studentId.trim().toUpperCase();
      const cleanStudentCode = normalize(studentCodeRaw);

      const emailRegex = /^n\d{6}@rguktn\.ac\.in$/i;
      const idRegex = /^N\d{6}$/i;

      /* ================= EMAIL & ID CHECKS ================= */
      const domain = emailLower.split("@")[1] || "";

      if (domain && !domain.startsWith("rguktn.ac")) {
        personalEmail.push(student);
      } else {
        if (!emailRegex.test(emailLower)) {
          emailIssues.push(student);
        }

        if (emailRegex.test(emailLower) && idRegex.test(idUpper)) {
          const emailNumber = emailLower.substring(1, 7);
          const idNumber = idUpper.substring(1, 7);
          if (emailNumber !== idNumber) {
            emailMismatch.push(student);
          }
        }
      }

      if (!idRegex.test(idUpper)) {
        idIssues.push(student);
      }

      /* ================= COURSE PREP ================= */
      const lowerRawCode = studentCodeRaw
        .toString()
        .trim()
        .toLowerCase();

      const cleanedRaw = lowerRawCode.replace(/\s+/g, "");

      /* =====================================================
         INVALID COURSE FORMAT
         ===================================================== */
      if (
        !cleanedRaw ||
        cleanedRaw === "" ||
        cleanedRaw === "nodatafound" ||
        cleanedRaw === "nosubfound" ||
        !cleanedRaw.startsWith("noc")
      ) {
        invalidCourses.push(student);
      }

      /* =====================================================
         COURSE VALIDATION (DB CHECK)
         ===================================================== */
      const courseData = courseMap.get(cleanStudentCode);

      if (
        !cleanedRaw ||
        cleanedRaw === "" ||
        cleanedRaw === "nodatafound" ||
        cleanedRaw === "nosubfound" ||
        !courseData
      ) {
        courseValidation.push(student);
      }

      /* =====================================================
         DURATION CHECK
         ===================================================== */
      if (courseData) {

        const durationRaw =
          courseData.Duration ||
          courseData.duration;

        const durationStr = (durationRaw || "")
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "");

        if (
          !durationStr ||
          durationStr === "" ||
          durationStr === "nodatafound" ||
          durationStr === "nosubfound"
        ) {
          durationCheck.push(student);
        } else {
          const numbers = durationStr.match(/\d+/g) || [];
          const has12 = numbers.some(num => parseInt(num) === 12);

          if (!has12) {
            durationCheck.push(student);
          }
        }

      } else {
        // If course doesn't exist, duration is automatically invalid
        durationCheck.push(student);
      }

    });

    return res.status(200).json({
      counts: {
        emailIssues: emailIssues.length,
        emailMismatch: emailMismatch.length,
        idIssues: idIssues.length,
        personalEmail: personalEmail.length,
        invalidCourses: invalidCourses.length,
        courseValidation: courseValidation.length,
        durationCheck: durationCheck.length,
      },
      data: {
        emailIssues,
        emailMismatch,
        idIssues,
        personalEmail,
        invalidCourses,
        courseValidation,
        durationCheck,
      },
    });

  } catch (error) {
    console.error("Analysis Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing analysis"
    });
  }
});

export default router;