# Customer Loyalty Rewards System

A web application for a factory that sells physical products in boxes. Customers prove they bought a product by entering a unique code printed inside the box, collect points, and spend those points on rewards. The factory owner has an admin dashboard to generate codes, watch for fraud, and manage customers and rewards.

**GitHub repository:** `<paste your public repository link here>`
**Deployed link:** Not deployed. The app runs locally (see below).

## How the three main questions are answered

| Question | Answer in this app |
|---|---|
| How does a customer prove they bought a product? | Every box contains a unique random code (format `XXXX-XXXX-XXXX`). Only someone who opened the box can read it. |
| How are fraud and code reuse prevented? | A code can be used once, enforced by the database. Codes are random and unguessable. Wrong attempts lock the customer out. Every attempt is logged. See `ARCHITECTURE.md`. |
| How does the owner view, manage and monitor rewards? | A secure admin area with statistics, code and batch management, customer management, reward management, and logs of every code attempt and points transaction. |

## Features

**Customers**
- Register and log in
- Dashboard with points balance and full transaction history
- Submit a product code and get points instantly (clear messages for invalid, used or disabled codes)
- Browse and redeem rewards

**Factory owner (admin)**
- Secure admin login (separate from customer login)
- Dashboard: total customers, codes submitted, codes redeemed, points awarded and more
- Generate batches of unique codes, download them as CSV for printing
- View all codes, search and filter them, see who redeemed each one, disable or re-enable unused codes
- View, search, disable and enable customers
- Add, edit, hide and restock rewards
- Monitoring: every code submission (good and bad) and every points transaction

## Technology stack

| Part | Technology |
|---|---|
| Frontend | React (built with Vite) and Bootstrap 5 |
| Backend | Node.js and Express 4 |
| Database | SQLite, using Node's built-in `node:sqlite` |
| Login sessions | `express-session` |
| Password hashing | `scrypt` from Node's built-in `crypto` |
| Tests | Node's built-in test runner |

Everything is free, and the database needs no separate server. Reasons for each choice are in `ARCHITECTURE.md`.

## Requirements

- Windows, macOS or Linux
- **Node.js 22.13 or newer** (download the LTS version from https://nodejs.org). Check with `node -v`.

## Setup and run (Windows)

1. Download or clone this repository and open the project folder in Command Prompt.
2. Create your settings file:
   ```
   copy .env.example .env
   ```
3. Open `.env` in Notepad and set your own values (see "Settings" below).
4. Install everything and build the website (takes a few minutes the first time):
   ```
   npm run setup
   ```
5. Start the app:
   ```
   npm start
   ```
6. Open http://localhost:3000 in your browser.

Customers use the **Customer login** and **Register** links. The factory owner uses **/admin/login** (link "Factory owner" in the menu) with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

### Settings (`.env`)

| Name | Meaning |
|---|---|
| `PORT` | Port the app listens on (default 3000) |
| `SESSION_SECRET` | Long random text used to protect login cookies |
| `ADMIN_EMAIL` | Email of the factory owner account |
| `ADMIN_PASSWORD` | Password of the factory owner account |
| `DB_FILE` | Where the database file is stored (default `./data/loyalty.db`) |

The admin account is created the **first time** the app starts. Changing `ADMIN_PASSWORD` later does not change an existing account. To start fresh, stop the app and delete the `data` folder.

## Run the tests

```
npm test
```

See `TESTING.md` for the full list of automated tests and the manual test plan with results.

## Development mode (optional)

Use two Command Prompt windows to get automatic reloading while editing:

```
npm run dev:server
npm run dev:client
```

Then open http://localhost:5173.

## Project structure

```
src/                 Backend (Express + SQLite)
  server.js          Starts the app
  app.js             Builds the Express app
  db.js              Creates the database tables
  routes/            Web endpoints (auth, customer, admin)
  middleware/        Login checks and rate limiting
  services/          The real logic: codes, rewards, users, admin queries
client/              Frontend (React + Bootstrap)
  src/pages/         One file per screen
tests/               Automated tests
```

## Documentation

- `ASSUMPTIONS.md` - every gap in the assignment and the choice made
- `ARCHITECTURE.md` - stack reasons, data model, diagrams, fraud controls
- `AI_LOG.md` - key AI interactions, including mistakes and fixes
- `TESTING.md` - automated tests and manual test plan with results
