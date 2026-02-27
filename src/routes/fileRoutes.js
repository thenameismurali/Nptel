import express from "express";
import FileRecord from "../models/FileRecord.js";

const router = express.Router();

router.get("/files", async (req, res) => {
  const files = await FileRecord.find().sort({ uploadedAt: -1 });
  res.json(files);
});

router.delete("/files/:id", async (req, res) => {
  await FileRecord.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;