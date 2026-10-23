
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function EditSubscription() {
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    billingCycle: "Monthly",
    renewalDate: "",
    category: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        if (!API_URL) {
          throw new Error("API URL is not configured");
        }

        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL.replace(/\/+$/, "")}/api/subscriptions/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/");
          return;
        }

        if (!response.ok) {
          setMessage(data.message || "Could not load subscription");
          return;
        }

        setFormData({
          name: data.subscription.name,
          amount: data.subscription.amount,
          billingCycle: data.subscription.billing_cycle,
          renewalDate: data.subscription.renewal_date.split("T")[0],
          category: data.subscription.category,
        });
      } catch (error) {
        console.error("Fetch subscription error:", error);

        setMessage(
          error.message === "API URL is not configured"
            ? "Server configuration is missing"
            : "Could not connect to the server"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [id, navigate]);

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
      setSaving(true);

      if (!API_URL) {
        throw new Error("API URL is not configured");
      }

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL.replace(/\/+$/, "")}/api/subscriptions/${id}`,
        {
          method: "PUT",
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
            ? "Subscription updated successfully"
            : "Could not update subscription")
      );

      if (response.ok) {
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (error) {
      console.error("Update subscription error:", error);

      setMessage(
        error.message === "API URL is not configured"
          ? "Server configuration is missing"
          : "Could not connect to the server"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2>Loading subscription...</h2>
      </div>
    );
  }

  return (
    <div>
      <h1>Edit Subscription</h1>

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
          placeholder="Category"
          value={formData.category}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={saving}>
          {saving ? "Updating..." : "Update Subscription"}
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

export default EditSubscription;
