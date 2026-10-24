import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

function AIChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const cleanText = (text) => {
    return text
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      .trim();
  };

  const formatAnswer = (text) => {
    if (!text) {
      return null;
    }

    const lines = text
      .split("\n")
      .map((line) => cleanText(line))
      .filter((line) => line.length > 0);

    return lines.map((line, index) => {
      /*
       * Detect common section headings dynamically.
       */
      const headingPatterns = [
        "Monthly Spending",
        "Subscription Breakdown",
        "Upcoming Renewals",
        "Highest Cost Subscription",
        "Recommendations",
        "Tips",
        "Summary",
        "Monthly Cost",
        "Yearly Cost",
      ];

      const isHeading = headingPatterns.some(
        (heading) =>
          line.toLowerCase() === heading.toLowerCase()
      );

      if (isHeading) {
        return (
          <div className="ai-section-title" key={index}>
            {line}
          </div>
        );
      }

      /*
       * Handle lines such as:
       *
       * Total Monthly Spending ₹3,347.00
       *
       * or:
       *
       * Total Monthly Spending: ₹3,347.00
       */
      if (
        line.toLowerCase().includes("total monthly spending")
      ) {
        const amountMatch = line.match(/₹[\d,]+(?:\.\d{1,2})?/);

        return (
          <div className="ai-total-card" key={index}>
            <div className="ai-total-label">
              Total Monthly Spending
            </div>

            {amountMatch && (
              <div className="ai-total-amount">
                {amountMatch[0]}
              </div>
            )}
          </div>
        );
      }

      /*
       * Handle highest-cost subscription.
       */
      if (
        line
          .toLowerCase()
          .includes("highest-cost subscription")
      ) {
        const amountMatch = line.match(
          /₹[\d,]+(?:\.\d{1,2})?/
        );

        const withoutLabel = line
          .replace(
            /highest-cost subscription/i,
            ""
          )
          .replace(/₹[\d,]+(?:\.\d{1,2})?/, "")
          .replace(/[:\-–]/g, "")
          .trim();

        return (
          <div className="ai-highlight-card" key={index}>
            <div className="ai-highlight-label">
              Highest Cost Subscription
            </div>

            <div className="ai-highlight-content">
              <span>{withoutLabel}</span>

              {amountMatch && (
                <strong>
                  {amountMatch[0]}
                </strong>
              )}
            </div>
          </div>
        );
      }

      /*
       * Handle bullet points.
       */
      if (
        line.startsWith("•") ||
        line.startsWith("-")
      ) {
        const content = line
          .replace(/^•\s*/, "")
          .replace(/^-\s*/, "")
          .trim();

        const separatorMatch = content.match(
          /^(.+?)\s+[—–-]\s+(₹[\d,]+(?:\.\d{1,2})?.*)$/
        );

        if (separatorMatch) {
          return (
            <div className="ai-subscription-item" key={index}>
              <div className="ai-item-name">
                <span className="ai-dot">•</span>

                <span>
                  {separatorMatch[1].trim()}
                </span>
              </div>

              <strong>
                {separatorMatch[2].trim()}
              </strong>
            </div>
          );
        }

        return (
          <div className="ai-bullet-item" key={index}>
            <span className="ai-dot">•</span>

            <span>{content}</span>
          </div>
        );
      }

      /*
       * Normal response text.
       */
      return (
        <p className="ai-text" key={index}>
          {line}
        </p>
      );
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    try {
      setLoading(true);
      setAnswer("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "AI request failed"
        );
      }

      setAnswer(data.answer);
      setQuestion("");
    } catch (error) {
      console.error(error);

      setAnswer(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ai-container">
      <div className="ai-header">
        <div className="ai-header-content">
          <div className="ai-title-row">
            <span className="ai-sparkle">✦</span>

            <h2>AI Spending Assistant</h2>
          </div>

          <p>
            Ask anything about your subscriptions,
            spending, or renewals.
          </p>
        </div>
      </div>

      <form
        className="ai-form"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          placeholder="Ask about your spending..."
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </form>

      {loading && (
        <div className="ai-loading">
          <div className="ai-loader">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <span>
            Analyzing your subscriptions...
          </span>
        </div>
      )}

      {answer && !loading && (
        <div className="ai-response">
          <div className="ai-response-header">
            <div className="ai-response-avatar">
              ✦
            </div>

            <div>
              <h3>AI Analysis</h3>

              <span>
                Based on your current subscriptions
              </span>
            </div>
          </div>

          <div className="ai-response-content">
            {formatAnswer(answer)}
          </div>
        </div>
      )}
    </section>
  );
}

export default AIChat;