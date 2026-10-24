import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function parseRenewalDate(value) {
  const dateOnly = String(value).split("T")[0];
  return new Date(`${dateOnly}T00:00:00`);
}

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

function Dashboard() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_URL}/api/subscriptions`,
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
          setMessage(data.message);
          return;
        }

        setSubscriptions(data.subscriptions);
      } catch (error) {
        setMessage("Could not connect to the server");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [navigate]);

  const handleStatusChange = async (subscription) => {
    const newStatus =
      subscription.status === "Active" ? "Cancelled" : "Active";

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/subscriptions/${subscription.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
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
        setMessage(data.message);
        return;
      }

      setSubscriptions((currentSubscriptions) =>
        currentSubscriptions.map((currentSubscription) =>
          currentSubscription.id === subscription.id
            ? data.subscription
            : currentSubscription
        )
      );

      setMessage(data.message);
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  };

  const handleDelete = async (subscriptionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subscription?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/subscriptions/${subscriptionId}`,
        {
          method: "DELETE",
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
        setMessage(data.message);
        return;
      }

      setSubscriptions((currentSubscriptions) =>
        currentSubscriptions.filter(
          (subscription) => subscription.id !== subscriptionId
        )
      );

      setMessage(data.message);
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const getRenewalInfo = (subscription) => {
    if (subscription.status === "Cancelled") {
      return {
        text: "Tracking paused",
        className: "renewal-cancelled",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const renewalDate = parseRenewalDate(
      subscription.renewal_date
    );

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const daysRemaining = Math.round(
      (renewalDate - today) / millisecondsPerDay
    );

    if (daysRemaining < 0) {
      const overdueDays = Math.abs(daysRemaining);

      return {
        text: `Overdue by ${overdueDays} ${
          overdueDays === 1 ? "day" : "days"
        }`,
        className: "renewal-overdue",
      };
    }

    if (daysRemaining === 0) {
      return {
        text: "Due today",
        className: "renewal-warning",
      };
    }

    if (daysRemaining <= 7) {
      return {
        text: `Due in ${daysRemaining} ${
          daysRemaining === 1 ? "day" : "days"
        }`,
        className: "renewal-warning",
      };
    }

    return {
      text: `Due in ${daysRemaining} days`,
      className: "renewal-normal",
    };
  };

  const activeSubscriptionList = subscriptions.filter(
    (subscription) => subscription.status === "Active"
  );

  const monthlySpending = activeSubscriptionList.reduce(
    (total, subscription) => {
      const amount = Number(subscription.amount);

      return subscription.billing_cycle === "Yearly"
        ? total + amount / 12
        : total + amount;
    },
    0
  );

  const categoryTotals = {};

  activeSubscriptionList.forEach((subscription) => {
    const amount = Number(subscription.amount);

    const monthlyAmount =
      subscription.billing_cycle === "Yearly"
        ? amount / 12
        : amount;

    categoryTotals[subscription.category] =
      (categoryTotals[subscription.category] || 0) +
      monthlyAmount;
  });

  const categorySpendingData = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }))
    .sort((first, second) => second.amount - first.amount);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextThirtyDays = new Date(today);
  nextThirtyDays.setDate(today.getDate() + 30);

  const upcomingRenewals = activeSubscriptionList.filter(
    (subscription) => {
      const renewalDate = parseRenewalDate(
        subscription.renewal_date
      );

      return renewalDate >= today && renewalDate <= nextThirtyDays;
    }
  ).length;

  const categories = [
    "All",
    ...new Set(
      subscriptions.map((subscription) => subscription.category)
    ),
  ];

  const filteredSubscriptions = subscriptions.filter(
    (subscription) => {
      const matchesSearch = subscription.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "All" ||
        subscription.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        subscription.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    }
  );

  if (loading) {
    return (
      <div>
        <h2>Loading dashboard...</h2>
      </div>
    );
  }

  return (
    <div>
      <h1>Subscription Dashboard</h1>
      <p>Welcome, {user?.name}</p>

      <div>
        <h3>Monthly Spending</h3>
        <p>₹{monthlySpending.toFixed(2)}</p>
      </div>

      <div>
        <h3>Active Subscriptions</h3>
        <p>{activeSubscriptionList.length}</p>
      </div>

      <div>
        <h3>Upcoming Renewals</h3>
        <p>{upcomingRenewals}</p>
      </div>

      <h2>Monthly Spending by Category</h2>

      {categorySpendingData.length === 0 ? (
        <p>Add an active subscription to display the chart.</p>
      ) : (
        <div style={{ width: "100%", height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categorySpendingData}
              margin={{
                top: 20,
                right: 20,
                left: 10,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="category"
                tick={{ fill: "#475569" }}
              />

              <YAxis
                tick={{ fill: "#475569" }}
                tickFormatter={(value) => `₹${value}`}
              />

              <Tooltip
                formatter={(value) => [
                  `₹${Number(value).toFixed(2)}`,
                  "Monthly spending",
                ]}
              />

              <Bar
                dataKey="amount"
                fill="#4f46e5"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <Link to="/add-subscription">
        <button>Add Subscription</button>
      </Link>

      <button onClick={handleLogout}>Logout</button>

      <h2>Your Subscriptions</h2>

      <div>
        <input
          type="text"
          placeholder="Search by subscription name"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category === "All" ? "All Categories" : category}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {message && <p>{message}</p>}

      {filteredSubscriptions.length === 0 ? (
        <p>No matching subscriptions found.</p>
      ) : (
        filteredSubscriptions.map((subscription) => {
          const renewalInfo = getRenewalInfo(subscription);

          return (
            <div key={subscription.id}>
              <h3>{subscription.name}</h3>

              <p>
                ₹{subscription.amount} / {subscription.billing_cycle}
              </p>

              <p>Category: {subscription.category}</p>
              <p>Status: {subscription.status}</p>

              <p>
                Renewal:{" "}
                {parseRenewalDate(
                  subscription.renewal_date
                ).toLocaleDateString("en-IN")}
              </p>

              <span
                className={`renewal-badge ${renewalInfo.className}`}
              >
                {renewalInfo.text}
              </span>

              <br />

              <Link to={`/edit-subscription/${subscription.id}`}>
                <button>Edit</button>
              </Link>

              <button onClick={() => handleStatusChange(subscription)}>
                {subscription.status === "Active"
                  ? "Mark Cancelled"
                  : "Mark Active"}
              </button>

              <button
                className="delete-button"
                onClick={() => handleDelete(subscription.id)}
              >
                Delete
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Dashboard;