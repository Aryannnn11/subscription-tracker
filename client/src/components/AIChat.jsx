import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

function AIChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const formatAnswer = (text) => {
    if (!text) return null;

    // Groq may return "₹2 718" or "₹2,718". Preserve the entire amount.
    const normalizeCurrency = (value) =>
      value.replace(/₹\s*\d[\d,\s]*(?:\.\d{1,2})?/g, (match) =>
        match.replace(/\s+/g, "").replace(/^₹/, "₹")
      );

    const lines = text
      .split("\n")
      .map((line) =>
        normalizeCurrency(line.replace(/\*\*/g, "").replace(/__/g, "").trim())
      )
      .filter(Boolean);

    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1] || "";

      // Handle "Total Monthly Spending" followed by an amount on the next line.
      if (/^(total monthly spending|total spending|monthly spending)\s*:?\s*$/i.test(line) &&
          /^₹[\d,]+(?:\.\d{1,2})?/.test(next)) {
        items.push({ kind: "total", label: line.replace(/:$/, ""), value: next });
        i++;
      } else if (/^[•*\-]\s*[^₹]+$/.test(line) &&
                 /^₹[\d,]+/.test(next)) {
        items.push({ kind: "subscription", value: line + " — " + next });
        i++;
      } else {
        items.push({ kind: "line", value: line });
      }
    }

    return items.map((item, index) => {
      if (item.kind === "total") {
        return (
          <div className="ai-total-card" key={index}>
            <span className="ai-total-label">{item.label}</span>
            <strong className="ai-total-amount">{item.value}</strong>
          </div>
        );
      }

      const line = item.value;
      const bullet = /^[•*\-]\s*/.test(line);
      const content = line.replace(/^[•*\-]\s*/, "").trim();
      const isHeading = !bullet && !content.includes("₹") &&
        /^(monthly (subscription )?spending|subscription breakdown|upcoming renewals|highest.cost subscription|recommendations|tips|summary|monthly cost|yearly cost|total monthly spending)$/i.test(content);

      if (isHeading) {
        return <h4 className="ai-section-title" key={index}>{content}</h4>;
      }

      const totalMatch = content.match(/^(total|total monthly spending|monthly spending)\s*:?\s*(₹[\d,]+(?:\.\d{1,2})?)/i);
      if (!bullet && totalMatch) {
        return (
          <div className="ai-total-card" key={index}>
            <span className="ai-total-label">{totalMatch[1]}</span>
            <strong className="ai-total-amount">{totalMatch[2]}</strong>
          </div>
        );
      }

      if (bullet && content.includes(" — ₹")) {
        const [name, ...details] = content.split(" — ");
        return (
          <div className="ai-subscription-item" key={index}>
            <span className="ai-item-name">{name}</span>
            <strong>{details.join(" — ")}</strong>
          </div>
        );
      }

      if (bullet) {
        return (
          <div className="ai-bullet-item" key={index}>
            <span className="ai-dot">•</span>
            <span>{content}</span>
          </div>
        );
      }

      return <p className="ai-text" key={index}>{content}</p>;
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