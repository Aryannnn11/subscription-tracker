import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/subscriptions",
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

      setMessage(data.message);

      if (response.ok) {
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (error) {
      setMessage("Could not connect to the server");
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