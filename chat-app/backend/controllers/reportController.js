const Report = require("../models/Report");

// POST /api/reports
const createReport = async (req, res) => {
  try {
    const { reportedUser, reason } = req.body;
    if (!reportedUser || !reason) {
      return res.status(400).json({ message: "Reported user and reason are required" });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser,
      reason,
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReport };
