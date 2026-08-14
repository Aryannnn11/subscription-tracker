const cron = require("node-cron");
const pool = require("../db");
const {
  sendRenewalReminder,
} = require("../services/emailService");

async function checkAndSendReminders() {
  const reminderDays =
    Number.parseInt(process.env.REMINDER_DAYS, 10) || 3;

  console.log("Checking for upcoming subscription renewals...");

  try {
    const result = await pool.query(
      `SELECT
         s.id,
         s.name AS subscription_name,
         s.amount,
         s.billing_cycle,
         s.renewal_date,
         u.name AS user_name,
         u.email
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'Active'
         AND s.renewal_date = CURRENT_DATE + $1::integer
         AND (
           s.reminder_sent_for_date IS NULL
           OR s.reminder_sent_for_date <> s.renewal_date
         )`,
      [reminderDays]
    );

    if (result.rows.length === 0) {
      console.log("No renewal reminders to send");
      return;
    }

    for (const subscription of result.rows) {
      try {
        await sendRenewalReminder({
          email: subscription.email,
          userName: subscription.user_name,
          subscriptionName: subscription.subscription_name,
          amount: subscription.amount,
          billingCycle: subscription.billing_cycle,
          renewalDate: subscription.renewal_date,
          daysRemaining: reminderDays,
        });

        await pool.query(
          `UPDATE subscriptions
           SET reminder_sent_for_date = renewal_date
           WHERE id = $1`,
          [subscription.id]
        );

        console.log(
          `Reminder sent for ${subscription.subscription_name} to ${subscription.email}`
        );
      } catch (error) {
        console.error(
          `Could not send reminder for ${subscription.subscription_name}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("Reminder job failed:", error.message);
  }
}

function startReminderJob() {
  cron.schedule(
    "0 9 * * *",
    async () => {
      await checkAndSendReminders();
    },
    {
      timezone: "Asia/Kolkata",
      noOverlap: true,
    }
  );

  console.log(
    "Email reminder job scheduled for 9:00 AM IST every day"
  );
}

module.exports = {
  checkAndSendReminders,
  startReminderJob,
};