const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const userRoutes = require("./routes/users");
const subscriptionRoutes = require("./routes/subscriptions");
const {
  startReminderJob,
} = require("./jobs/reminderJob");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Subscription Tracker API is running",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  startReminderJob();
});