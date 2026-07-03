import express from "express";
import multer from "multer";
import path from "path";
import { protect } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|mpeg|mp3|wav|ogg|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed"));
  },
});

router.post("/", protect, upload.single("file"), (req, res) => {
  if (!req.file) {
    return sendError(res, 400, "No file uploaded");
  }

  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  return sendSuccess(res, 201, "File uploaded successfully", { url });
});

export default router;
