const pool = require("../db");

// =========================
// GET SUBSCRIPTION SUMMARY
// =========================

async function getSubscriptionSummary(userId) {
  const result = await pool.query(
    `SELECT
      id,
      name,
      amount,
      billing_cycle,
      renewal_date,
      category,
      status
     FROM subscriptions
     WHERE user_id = $1
     AND status = 'Active'
     ORDER BY name`,
    [userId]
  );

  const subscriptions = result.rows;

  let monthlySpending = 0;
  let yearlySpending = 0;

  let highestCostSubscription = null;
  let highestMonthlyEquivalent = 0;

  const subscriptionBreakdown = [];

  for (const subscription of subscriptions) {
    const amount = Number(subscription.amount);

    let monthlyEquivalent;
    let yearlyCost;

    if (subscription.billing_cycle === "Monthly") {
      monthlyEquivalent = amount;
      yearlyCost = amount * 12;
    } else if (subscription.billing_cycle === "Yearly") {
      monthlyEquivalent = amount / 12;
      yearlyCost = amount;
    } else {
      continue;
    }

    monthlySpending += monthlyEquivalent;
    yearlySpending += yearlyCost;

    subscriptionBreakdown.push({
      name: subscription.name,
      amount,
      billingCycle: subscription.billing_cycle,
      renewalDate: subscription.renewal_date,
      category: subscription.category,
      monthlyEquivalent: Number(
        monthlyEquivalent.toFixed(2)
      ),
      yearlyCost: Number(
        yearlyCost.toFixed(2)
      ),
    });

    if (
      monthlyEquivalent > highestMonthlyEquivalent
    ) {
      highestMonthlyEquivalent =
        monthlyEquivalent;

      highestCostSubscription = {
        name: subscription.name,
        amount,
        billingCycle:
          subscription.billing_cycle,
        monthlyEquivalent: Number(
          monthlyEquivalent.toFixed(2)
        ),
        renewalDate:
          subscription.renewal_date,
      };
    }
  }

  return {
    monthlySpending: Number(
      monthlySpending.toFixed(2)
    ),

    yearlySpending: Number(
      yearlySpending.toFixed(2)
    ),

    activeSubscriptions:
      subscriptions.length,

    highestCostSubscription,

    subscriptionBreakdown,
  };
}

// =========================
// GET UPCOMING RENEWALS
// =========================

async function getUpcomingRenewals(
  userId,
  daysAhead
) {
  const days = Number(daysAhead);

  if (!Number.isInteger(days) || days < 1) {
    throw new Error(
      "daysAhead must be a positive integer"
    );
  }

  const result = await pool.query(
    `SELECT
      id,
      name,
      amount,
      billing_cycle,
      renewal_date,
      category
     FROM subscriptions
     WHERE user_id = $1
     AND status = 'Active'
     AND renewal_date >= CURRENT_DATE
     AND renewal_date < CURRENT_DATE + ($2 * INTERVAL '1 day')
     ORDER BY renewal_date ASC`,
    [userId, days]
  );

  return {
    daysAhead: days,

    count: result.rows.length,

    renewals: result.rows.map(
      (subscription) => ({
        name: subscription.name,

        amount: Number(
          subscription.amount
        ),

        billingCycle:
          subscription.billing_cycle,

        renewalDate:
          subscription.renewal_date,

        category:
          subscription.category,
      })
    ),
  };
}

// =========================
// GET SUBSCRIPTION DETAILS
// =========================

async function getSubscriptionDetails(
  userId,
  subscriptionName
) {
  if (
    !subscriptionName ||
    typeof subscriptionName !== "string"
  ) {
    throw new Error(
      "subscriptionName must be a non-empty string"
    );
  }

  const result = await pool.query(
    `SELECT
      id,
      name,
      amount,
      billing_cycle,
      renewal_date,
      category,
      status
     FROM subscriptions
     WHERE user_id = $1
     AND LOWER(name) = LOWER($2)
     LIMIT 1`,
    [userId, subscriptionName.trim()]
  );

  if (result.rows.length === 0) {
    return {
      found: false,
      message: "Subscription not found.",
    };
  }

  const subscription = result.rows[0];

  return {
    found: true,

    subscription: {
      id: subscription.id,

      name: subscription.name,

      amount: Number(
        subscription.amount
      ),

      billingCycle:
        subscription.billing_cycle,

      renewalDate:
        subscription.renewal_date,

      category:
        subscription.category,

      status:
        subscription.status,
    },
  };
}

// =========================
// GET SPENDING BY CATEGORY
// =========================

async function getSpendingByCategory(userId) {
  const result = await pool.query(
    `SELECT
      LOWER(TRIM(category)) AS category,
      SUM(
        CASE
          WHEN billing_cycle = 'Monthly'
            THEN amount
          WHEN billing_cycle = 'Yearly'
            THEN amount / 12
          ELSE 0
        END
      ) AS monthly_spending
     FROM subscriptions
     WHERE user_id = $1
     AND status = 'Active'
     GROUP BY LOWER(TRIM(category))
     ORDER BY monthly_spending DESC`,
    [userId]
  );

  const categories = result.rows.map(
    (category) => {
      const normalizedCategory =
        category.category;

      let displayCategory =
        normalizedCategory
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() +
              word.slice(1)
          )
          .join(" ");

      // Preserve the common acronym "AI"
      if (
        normalizedCategory === "ai"
      ) {
        displayCategory = "AI";
      }

      return {
        category: displayCategory,

        monthlySpending: Number(
          Number(
            category.monthly_spending
          ).toFixed(2)
        ),
      };
    }
  );

  const totalMonthlySpending =
    categories.reduce(
      (total, category) =>
        total + category.monthlySpending,
      0
    );

  return {
    totalMonthlySpending: Number(
      totalMonthlySpending.toFixed(2)
    ),

    categories,
  };
}

// =========================
// EXPORT TOOLS
// =========================

module.exports = {
  getSubscriptionSummary,
  getUpcomingRenewals,
  getSubscriptionDetails,
  getSpendingByCategory,
};