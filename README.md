# Subscription Tracker

A full-stack subscription management application that helps users track recurring expenses, renewal dates, subscription status, and category-wise spending from a single dashboard.

The application also sends automatic email reminders before upcoming renewals.

## Features

- User registration and login
- Password hashing with bcrypt
- JWT-based authentication
- Protected frontend and backend routes
- User-specific subscription data
- Add, view, edit, and delete subscriptions
- Mark subscriptions as active or cancelled
- Monthly spending calculation
- Active subscription count
- Upcoming renewal tracking
- Renewal urgency indicators
- Search by subscription name
- Filter by category and status
- Category-wise spending chart
- Automatic email renewal reminders
- Duplicate reminder-email protection
- Responsive user interface

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Recharts
- CSS

### Backend

- Node.js
- Express.js
- JSON Web Token
- bcrypt
- Nodemailer
- node-cron

### Database

- PostgreSQL

## Project Structure

```text
sub-tracker/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
├── server/
│   ├── jobs/
│   │   └── reminderJob.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── subscriptions.js
│   │   └── users.js
│   ├── services/
│   │   └── emailService.js
│   ├── .env.example
│   ├── db.js
│   ├── server.js
│   └── package.json
├── .gitignore
└── README.md
```

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Aryannnn11/subscription-tracker.git
cd subscription-tracker
```

### 2. Create the PostgreSQL database

Create a database named:

```text
subscription_tracker
```

Run the following SQL:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  billing_cycle VARCHAR(20) NOT NULL
    CHECK (billing_cycle IN ('Monthly', 'Yearly')),
  renewal_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'Active'
    CHECK (status IN ('Active', 'Cancelled')),
  reminder_sent_for_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file using `.env.example`:

```env
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=subscription_tracker
DB_PASSWORD=your_postgresql_password
DB_PORT=5432
JWT_SECRET=your_secure_jwt_secret

EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
REMINDER_DAYS=3
```

The Gmail App Password requires 2-Step Verification. Never use your normal Gmail password.

Start the backend:

```bash
node server.js
```

The API runs at:

```text
http://localhost:5000
```

### 4. Configure the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

## Email Reminder Workflow

1. The backend scheduler runs every day at 9:00 AM IST.
2. It finds active subscriptions renewing after the configured number of days.
3. A formatted reminder email is sent to the registered user.
4. The renewal date is recorded in `reminder_sent_for_date`.
5. The same reminder cannot be sent twice for one renewal date.

The reminder scheduler only runs while the backend server is active.

## API Endpoints

### Users

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/register` | Register a user |
| POST | `/api/users/login` | Log in and receive a JWT |

### Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/subscriptions` | Get the logged-in user's subscriptions |
| GET | `/api/subscriptions/:id` | Get one subscription |
| POST | `/api/subscriptions` | Add a subscription |
| PUT | `/api/subscriptions/:id` | Update a subscription |
| PATCH | `/api/subscriptions/:id/status` | Change subscription status |
| DELETE | `/api/subscriptions/:id` | Delete a subscription |

## Security

- Passwords are hashed before storage.
- Protected routes require a valid JWT.
- Database queries use parameterized SQL.
- Users can only access and modify their own subscriptions.
- Email credentials and database secrets are stored in environment variables.
- Secret files are excluded from Git.
- Reminder emails include duplicate-send protection.

## Future Improvements

- Password reset
- Automated testing
- Cloud deployment
- OAuth authentication

## Author

Aryan Kumar