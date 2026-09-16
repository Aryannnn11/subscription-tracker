const OpenAI = require("openai");

const {
  getSubscriptionSummary,
  getUpcomingRenewals,
  getSubscriptionDetails,
  getSpendingByCategory,
} = require("./subscriptionTools");

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// =========================
// AVAILABLE AI TOOLS
// =========================

const tools = [
  {
    type: "function",
    function: {
      name: "getSubscriptionSummary",
      description:
        "Gets the authenticated user's subscription spending summary, including monthly spending, yearly spending, active subscription count, highest-cost subscription, and subscription breakdown.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getUpcomingRenewals",
      description:
        "Gets the authenticated user's active subscriptions that are scheduled to renew within a specified number of days.",
      parameters: {
        type: "object",
        properties: {
          daysAhead: {
            type: "integer",
            description:
              "Number of days from today to search for upcoming renewals.",
            minimum: 1,
          },
        },
        required: ["daysAhead"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getSubscriptionDetails",
      description:
        "Gets the complete details of one specific subscription belonging to the authenticated user.",
      parameters: {
        type: "object",
        properties: {
          subscriptionName: {
            type: "string",
            description:
              "The exact name of the subscription to look up.",
          },
        },
        required: ["subscriptionName"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "getSpendingByCategory",
      description:
        "Gets the authenticated user's monthly subscription spending grouped by category. Use this when the user asks about spending by category, category-wise spending, how much they spend on a category, or which categories cost the most.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

// =========================
// SYSTEM PROMPT
// =========================

const systemPrompt = `
You are an AI Subscription and Spending Assistant.

Your job is to help the user understand their subscriptions,
spending, renewal dates, and subscription-related questions.

TOOL RULES:

1. Use available tools when the question requires subscription data.
2. You may use multiple tools if the question requires different
   pieces of information.
3. Use the tool results as the source of truth.
4. Never invent subscription information.
5. Never invent prices, totals, or financial information.
6. Never invent renewal dates.
7. If information is unavailable, clearly explain that.

AVAILABLE TOOLS:

getSubscriptionSummary:
Use for:

- Monthly spending
- Yearly spending
- Total spending
- Active subscription count
- Highest-cost subscription
- Overall subscription breakdown

getUpcomingRenewals:
Use for:

- Upcoming renewals
- Renewals this week
- Renewals in the next few days
- Renewals in the next month
- Renewal dates for subscriptions

getSubscriptionDetails:
Use for:

- Details about one specific subscription
- Price of a specific subscription
- Billing cycle of a specific subscription
- Renewal date of a specific subscription
- Category of a specific subscription
- Status of a specific subscription

getSpendingByCategory:
Use for:

- Spending by category
- Category-wise spending
- How much the user spends on a category
- Which categories cost the most
- Comparing spending between categories
- Monthly spending grouped by category

TOOL SELECTION:

- Use 7 days for "this week".
- Use 30 days for "next 30 days".
- Use 30 days when no renewal period is specified.
- Use the number provided by the user when they specify days.
- Use getSubscriptionDetails when the user asks about one
  specific subscription.
- Use getSpendingByCategory when the user asks about
  category-based spending.
- If a question requires both spending and renewal information,
  use multiple tools when necessary.

RESPONSE STYLE:

1. Keep responses concise and easy to understand.
2. Use short sections when appropriate.
3. Use bullet points for lists.
4. Use ₹ for Indian currency.
5. Format dates in a readable form.
6. Do not use markdown tables.
7. Do not use "|" characters.
8. Do not use ** for bold text.
9. Do not invent examples using subscription data.

The application's database and tool results are the source
of truth for the user's subscription information.
`;

// =========================
// EXECUTE A TOOL
// =========================

async function executeTool(toolCall, userId) {
  const toolName = toolCall.function.name;

  let argumentsObject = {};

  try {
    argumentsObject = JSON.parse(
      toolCall.function.arguments || "{}"
    );
  } catch (error) {
    return {
      error: "Invalid tool arguments",
    };
  }

  if (toolName === "getSubscriptionSummary") {
    return await getSubscriptionSummary(userId);
  }

  if (toolName === "getUpcomingRenewals") {
    const daysAhead =
      argumentsObject.daysAhead || 30;

    return await getUpcomingRenewals(
      userId,
      daysAhead
    );
  }

  if (toolName === "getSubscriptionDetails") {
    return await getSubscriptionDetails(
      userId,
      argumentsObject.subscriptionName
    );
  }

  if (toolName === "getSpendingByCategory") {
    return await getSpendingByCategory(userId);
  }

  return {
    error: `Unknown tool: ${toolName}`,
  };
}

// =========================
// AI SUBSCRIPTION ASSISTANT
// =========================

async function askAI(question, userId) {
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },

    {
      role: "user",
      content: question,
    },
  ];

  const maximumToolRounds = 5;

  for (
    let round = 0;
    round < maximumToolRounds;
    round++
  ) {
    const response =
      await client.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages,
        tools,
        tool_choice: "auto",
      });

    const assistantMessage =
      response.choices[0].message;

    messages.push(assistantMessage);

    // =========================
    // FINAL ANSWER
    // =========================

    if (
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      return assistantMessage.content;
    }

    // =========================
    // EXECUTE ALL REQUESTED TOOLS
    // =========================

    for (const toolCall of assistantMessage.tool_calls) {
      const toolResult = await executeTool(
        toolCall,
        userId
      );

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return "I could not complete the analysis. Please try again.";
}

module.exports = {
  askAI,
};