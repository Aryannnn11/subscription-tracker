const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const characters = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return characters[character];
  });
}

function formatDate(value) {
  const dateOnly = String(value).split("T")[0];
  const date = new Date(`${dateOnly}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function verifyEmailConnection() {
  await transporter.verify();
}

async function sendTestEmail() {
  await transporter.sendMail({
    from: `"Subscription Tracker" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: "Subscription Tracker email test",
    text: "Your Subscription Tracker email configuration is working.",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #4f46e5;">
          Subscription Tracker
        </h2>

        <p>Your email configuration is working successfully.</p>
      </div>
    `,
  });
}

async function sendRenewalReminder({
  email,
  userName,
  subscriptionName,
  amount,
  billingCycle,
  renewalDate,
  daysRemaining,
}) {
  const safeUserName = escapeHtml(userName);
  const safeSubscriptionName = escapeHtml(subscriptionName);
  const formattedDate = formatDate(renewalDate);

  await transporter.sendMail({
    from: `"Subscription Tracker" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${subscriptionName} renews in ${daysRemaining} days`,
    text: [
      `Hello ${userName},`,
      "",
      `Your ${subscriptionName} subscription renews in ${daysRemaining} days.`,
      `Amount: ₹${amount}`,
      `Billing cycle: ${billingCycle}`,
      `Renewal date: ${formattedDate}`,
    ].join("\n"),
    html: `
      <div
        style="
          max-width: 560px;
          margin: auto;
          padding: 24px;
          font-family: Arial, sans-serif;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        "
      >
        <h2 style="color: #4f46e5;">
          Subscription Renewal Reminder
        </h2>

        <p>Hello ${safeUserName},</p>

        <p>
          Your <strong>${safeSubscriptionName}</strong>
          subscription renews in
          <strong>${daysRemaining} days</strong>.
        </p>

        <div
          style="
            padding: 16px;
            background: #f8fafc;
            border-radius: 10px;
          "
        >
          <p><strong>Amount:</strong> ₹${amount}</p>
          <p><strong>Billing cycle:</strong> ${billingCycle}</p>
          <p><strong>Renewal date:</strong> ${formattedDate}</p>
        </div>

        <p style="margin-top: 20px; color: #64748b;">
          This reminder was sent by your Subscription Tracker.
        </p>
      </div>
    `,
  });
}

module.exports = {
  verifyEmailConnection,
  sendTestEmail,
  sendRenewalReminder,
};