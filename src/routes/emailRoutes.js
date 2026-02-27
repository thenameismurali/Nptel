import express from "express";
import nodemailer from "nodemailer";
import { getCachedResult } from "../utils/analysisCache.js";

const router = express.Router();

router.post("/send-error-mails", async (req, res) => {
  console.log("🔥 /send-error-mails route triggered");

  try {
    const cachedResult = getCachedResult();

    if (!cachedResult) {
      return res.status(400).json({
        success: false,
        message: "Please run analysis first"
      });
    }

    const departmentData = {};

    /* ================= GROUP ERRORS BY DEPARTMENT ================= */
    Object.entries(cachedResult.data).forEach(([errorType, errorArray]) => {
      errorArray.forEach(student => {

        const deptRaw =
          student.department ||
          student.Department ||
          student.dept ||
          student.branch ||
          "UNKNOWN";

        const dept = deptRaw.toString().trim().toUpperCase();

        if (!departmentData[dept]) {
          departmentData[dept] = {
            students: [],
            typeCounts: {}
          };
        }

        departmentData[dept].students.push(student);

        // Count per error type
        departmentData[dept].typeCounts[errorType] =
          (departmentData[dept].typeCounts[errorType] || 0) + 1;
      });
    });

    console.log("🏫 Departments detected:", Object.keys(departmentData));

    const hodEmails = {
      CSE: "csehod@gmail.com",
      ECE: "heheee123790@gmail.com",
      MECH: "mechhod@gmail.com",
      CHEMICAL: "chemhod@gmail.com",
      CIVIL: "civilhod@gmail.com",
      EEE: "eeehod@gmail.com",
      MME: "mmehod@gmail.com"
    };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const sent = [];
    const skipped = [];

    /* ================= SEND MAIL PER DEPARTMENT ================= */
    for (const dept in departmentData) {

      const deptInfo = departmentData[dept];
      const errors = deptInfo.students;
      const typeCounts = deptInfo.typeCounts;
      const hodEmail = hodEmails[dept];

      console.log(`\n➡ Processing Department: ${dept}`);
      console.log("   Total Errors:", errors.length);

      if (!hodEmail) {
        skipped.push({ dept, reason: "No HOD Email" });
        continue;
      }

      if (!errors.length) {
        skipped.push({ dept, reason: "No Errors" });
        continue;
      }

      /* ================= CREATE CSV ================= */
      let csvContent = "\ufeff";
      const headers = Object.keys(errors[0]).join(",");
      csvContent += headers + "\n";

      errors.forEach(row => {
        csvContent += Object.values(row)
          .map(val => `"${val}"`)
          .join(",") + "\n";
      });

      /* ================= CREATE EMAIL BODY ================= */
      let summaryText = `Dear HOD (${dept}),\n\n`;
      summaryText += `Total Errors Found: ${errors.length}\n\n`;
      summaryText += `Error Breakdown:\n`;

      Object.entries(typeCounts).forEach(([type, count]) => {
        summaryText += `- ${type}: ${count}\n`;
      });

      summaryText += `\nPlease find the detailed CSV report attached.\n\nRegards,\nNPTEL Admin Portal`;

      await transporter.sendMail({
        from: `"NPTEL Portal" <${process.env.EMAIL_USER}>`,
        to: hodEmail,
        subject: `NPTEL Error Report - ${dept} (Total: ${errors.length})`,
        text: summaryText,
        attachments: [
          {
            filename: `${dept}_Errors.csv`,
            content: csvContent
          }
        ]
      });

      console.log(`✅ Email sent successfully to ${dept}`);
      sent.push(dept);
    }

    res.json({ success: true, sent, skipped });

  } catch (error) {
    console.error("❌ Mail sending error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;