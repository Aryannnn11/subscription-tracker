const express = require("express");

const router = express.Router();

const { askAI } = require("../services/aiService");
const authenticateToken = require("../middleware/auth");

// =========================
// AI TEST ROUTE
// =========================

router.post("/test", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    const answer = await askAI(question, null);

    res.json({
      answer,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "AI request failed",
    });
  }
});

// =========================
// AUTHENTICATED AI CHAT
// =========================

router.post("/chat", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    const answer = await askAI(question, userId);

    res.json({
      answer,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "AI chat failed",
    });
  }
});

module.exports = router;