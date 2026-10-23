
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function AddSubscription() {
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    billingCycle: "Monthly",
    renewalDate: "",
    category: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      setLoading(true);

      if (!API_URL) {
        throw new Error("API URL is not configured");
      }

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL.replace(/\/+$/, "")}/api/subscriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      setMessage(
        data.message ||
          (response.ok
            ? "Subscription saved successfully"
            : "Could not save subscription")
      );

      if (response.ok) {
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (error) {
      console.error("Add subscription error:", error);

      setMessage(
        error.message === "API URL is not configured"
          ? "Server configuration is missing"
          : "Could not connect to the server"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Add Subscription</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Subscription name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="amount"
          placeholder="Amount"
          value={formData.amount}
          onChange={handleChange}
          min="1"
          step="0.01"
          required
        />

        <select
          name="billingCycle"
          value={formData.billingCycle}
          onChange={handleChange}
        >
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
        </select>

        <input
          type="date"
          name="renewalDate"
          value={formData.renewalDate}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="category"
          placeholder="Category, e.g. Entertainment"
          value={formData.category}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Subscription"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          Cancel
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default AddSubscription;
