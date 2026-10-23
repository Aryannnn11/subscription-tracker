
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

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

function parseRenewalDate(value) {
  if (!value) return null;

  const dateOnly = String(value).split("T")[0];
  const date = new Date(`${dateOnly}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseRenewalDate(value);

  if (!date) return "N/A";

  return date.toLocaleDateString("en-IN");
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Dashboard() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const navigate = useNavigate();

  let user = null;

  try {
    const storedUser = localStorage.getItem("user");
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!API_URL) {
        throw new Error("VITE_API_URL is not configured");
      }

      const token = localStorage.getItem("token");

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await fetch(
        `${API_URL}/api/subscriptions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load subscriptions"
        );
      }

      setSubscriptions(
        Array.isArray(data.subscriptions)
          ? data.subscriptions
          : []
      );
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setMessage(error.message || "Could not load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    // Load subscriptions when the dashboard mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (subscription) => {
    const newStatus =
      subscription.status === "Active" ? "Cancelled" : "Active";

    try {
      setMessage("");

      if (!API_URL) {
        throw new Error("VITE_API_URL is not configured");
      }

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

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not update subscription"
        );
      }

      setSubscriptions((previous) =>
        previous.map((item) =>
          item.id === subscription.id
            ? {
                ...item,
                status: data.subscription?.status || newStatus,
              }
            : item
        )
      );

      setMessage(data.message || "Status updated successfully");
    } catch (error) {
      console.error("Status update error:", error);
      setMessage(error.message || "Could not update subscription");
    }
  };

  const handleDelete = async (subscriptionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subscription?"
    );

    if (!confirmed) return;

    try {
      setMessage("");

      if (!API_URL) {
        throw new Error("VITE_API_URL is not configured");
      }

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

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not delete subscription"
        );
      }

      setSubscriptions((previous) =>
        previous.filter((item) => item.id !== subscriptionId)
      );

      setMessage(
        data.message || "Subscription deleted successfully"
      );
    } catch (error) {
      console.error("Delete subscription error:", error);
      setMessage(error.message || "Could not delete subscription");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const name = String(subscription.name || "").toLowerCase();
    const category = String(subscription.category || "").toLowerCase();

    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      category.includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" ||
      subscription.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" ||
      subscription.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [
    "All",
    ...new Set(subscriptions.map((item) => item.category).filter(Boolean)),
  ];

  const activeSubscriptions = subscriptions.filter(
    (item) => item.status === "Active"
  );

  const monthlySpending = activeSubscriptions.reduce((total, item) => {
    const amount = Number(item.amount) || 0;

    return (
      total +
      (String(item.billing_cycle).toLowerCase() === "yearly"
        ? amount / 12
        : amount)
    );
  }, 0);

  const yearlySpending = monthlySpending * 12;

  const chartData = Object.values(
    activeSubscriptions.reduce((result, subscription) => {
      const category = subscription.category || "Other";
      const amount = Number(subscription.amount) || 0;

      const monthlyAmount =
        String(subscription.billing_cycle).toLowerCase() === "yearly"
          ? amount / 12
          : amount;

      if (!result[category]) {
        result[category] = {
          category,
          amount: 0,
        };
      }

      result[category].amount += monthlyAmount;

      return result;
    }, {})
  );

  const upcomingRenewals = activeSubscriptions
    .filter((item) => {
      const date = parseRenewalDate(item.renewal_date);
      return date && date >= new Date(new Date().setHours(0, 0, 0, 0));
    })
    .sort(
      (a, b) =>
        parseRenewalDate(a.renewal_date) -
        parseRenewalDate(b.renewal_date)
    )
    .slice(0, 5);

  const styles = {
    container: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "30px 20px",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "15px",
      marginBottom: "25px",
    },
    card: {
      background: "#ffffff",
      borderRadius: "14px",
      padding: "22px",
      marginBottom: "20px",
      boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    },
    button: {
      padding: "10px 16px",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      background: "#4f46e5",
      color: "white",
      textDecoration: "none",
      display: "inline-block",
      fontWeight: "600",
    },
    input: {
      padding: "12px",
      border: "1px solid #cbd5e1",
      borderRadius: "8px",
      width: "100%",
      boxSizing: "border-box",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
    },
    cell: {
      padding: "14px",
      borderBottom: "1px solid #e5e7eb",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>Subscription Dashboard</h1>
          <p>
            Welcome{user?.name ? `, ${user.name}` : ""}!
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link to="/add-subscription" style={styles.button}>
            + Add Subscription
          </Link>

          <button
            onClick={handleLogout}
            style={{
              ...styles.button,
              background: "#64748b",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {message && (
        <div style={styles.card}>
          <p>{message}</p>
        </div>
      )}

      {loading ? (
        <div style={styles.card}>
          <p>Loading subscriptions...</p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={styles.card}>
              <h3>Total Subscriptions</h3>
              <h2>{subscriptions.length}</h2>
            </div>

            <div style={styles.card}>
              <h3>Active Subscriptions</h3>
              <h2>{activeSubscriptions.length}</h2>
            </div>

            <div style={styles.card}>
              <h3>Monthly Spending</h3>
              <h2>{formatCurrency(monthlySpending)}</h2>
            </div>

            <div style={styles.card}>
              <h3>Yearly Spending</h3>
              <h2>{formatCurrency(yearlySpending)}</h2>
            </div>
          </div>

          <div style={styles.card}>
            <h2>Monthly Spending by Category</h2>

            {chartData.length === 0 ? (
              <p>No active subscriptions to display.</p>
            ) : (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#4f46e5"
                      name="Monthly Spending"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h2>Upcoming Renewals</h2>

            {upcomingRenewals.length === 0 ? (
              <p>No upcoming renewals.</p>
            ) : (
              <ul>
                {upcomingRenewals.map((subscription) => (
                  <li
                    key={subscription.id}
                    style={{ marginBottom: "10px" }}
                  >
                    <strong>{subscription.name}</strong>
                    {" — "}
                    {formatDate(subscription.renewal_date)}
                    {" — "}
                    {formatCurrency(subscription.amount)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={styles.card}>
            <h2>Your Subscriptions</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <input
                type="text"
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                style={styles.input}
              />

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                style={styles.input}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                style={styles.input}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {filteredSubscriptions.length === 0 ? (
              <p>No subscriptions found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.cell}>Name</th>
                      <th style={styles.cell}>Amount</th>
                      <th style={styles.cell}>Billing</th>
                      <th style={styles.cell}>Renewal</th>
                      <th style={styles.cell}>Category</th>
                      <th style={styles.cell}>Status</th>
                      <th style={styles.cell}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSubscriptions.map((subscription) => (
                      <tr key={subscription.id}>
                        <td style={styles.cell}>
                          {subscription.name}
                        </td>

                        <td style={styles.cell}>
                          {formatCurrency(subscription.amount)}
                        </td>

                        <td style={styles.cell}>
                          {subscription.billing_cycle}
                        </td>

                        <td style={styles.cell}>
                          {formatDate(subscription.renewal_date)}
                        </td>

                        <td style={styles.cell}>
                          {subscription.category}
                        </td>

                        <td style={styles.cell}>
                          {subscription.status}
                        </td>

                        <td style={styles.cell}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <Link
                              to={`/edit-subscription/${subscription.id}`}
                              style={styles.button}
                            >
                              Edit
                            </Link>

                            <button
                              style={{
                                ...styles.button,
                                background: "#f59e0b",
                              }}
                              onClick={() =>
                                handleStatusChange(subscription)
                              }
                            >
                              {subscription.status === "Active"
                                ? "Cancel"
                                : "Reactivate"}
                            </button>

                            <button
                              style={{
                                ...styles.button,
                                background: "#dc2626",
                              }}
                              onClick={() =>
                                handleDelete(subscription.id)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
