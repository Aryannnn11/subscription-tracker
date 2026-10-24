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
