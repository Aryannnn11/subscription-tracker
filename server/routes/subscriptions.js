const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Add subscription
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      amount,
      billingCycle,
      renewalDate,
      category,
    } = req.body;

    if (
      !name ||
      !amount ||
      !billingCycle ||
      !renewalDate ||
      !category
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO subscriptions
       (user_id, name, amount, billing_cycle, renewal_date, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.userId,
        name,
        amount,
        billingCycle,
        renewalDate,
        category,
      ]
    );

    res.status(201).json({
      message: "Subscription added successfully",
      subscription: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Get all subscriptions
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, amount, billing_cycle, renewal_date,
              category, status, created_at
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY renewal_date ASC`,
      [req.user.userId]
    );

    res.json({
      subscriptions: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Get one subscription
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, amount, billing_cycle, renewal_date,
              category, status
       FROM subscriptions
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    res.json({
      subscription: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Update subscription details
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      amount,
      billingCycle,
      renewalDate,
      category,
    } = req.body;

    if (
      !name ||
      !amount ||
      !billingCycle ||
      !renewalDate ||
      !category
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const result = await pool.query(
      `UPDATE subscriptions
       SET name = $1,
           amount = $2,
           billing_cycle = $3,
           renewal_date = $4,
           category = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        name,
        amount,
        billingCycle,
        renewalDate,
        category,
        req.params.id,
        req.user.userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    res.json({
      message: "Subscription updated successfully",
      subscription: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Cancel or reactivate subscription in the tracker
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Active", "Cancelled"].includes(status)) {
      return res.status(400).json({
        message: "Invalid subscription status",
      });
    }

    const result = await pool.query(
      `UPDATE subscriptions
       SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    res.json({
      message:
        status === "Active"
          ? "Subscription reactivated"
          : "Subscription cancelled",
      subscription: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Delete subscription
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM subscriptions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Subscription not found",
      });
    }

    res.json({
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;