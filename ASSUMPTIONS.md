# Assumptions

The assignment leaves many details open. This file lists every gap I filled and why I chose that option.

## Proof of purchase and codes

| # | Assumption | Why |
|---|---|---|
| 1 | A customer proves a purchase by entering a unique code printed **inside** the box (hidden until the box is opened). No receipts or photos are used. | A hidden code is the simplest proof that the box was bought and opened. A receipt or photo check would need manual review or image tools, which is more complicated. |
| 2 | Codes are 12 characters from an alphabet of 31 characters, shown as `XXXX-XXXX-XXXX`. The alphabet leaves out 0, O, 1, I and L. | That gives about 7.9 x 10^17 combinations, so guessing is not realistic. Leaving out look-alike characters avoids typing mistakes from a printed box. |
| 3 | Codes are random (from Node's secure random generator), not sequential. | Sequential codes can be guessed. Random ones cannot. |
| 4 | Customers can type a code in lowercase and with spaces or dashes. The app cleans it up. | Makes it easier for real customers without weakening security. |
| 5 | A code is not tied to any customer until it is redeemed. | The factory prints codes before anyone buys the product. |
| 6 | Each code is worth a fixed number of points, set per batch by the owner. The form suggests 100. | The owner may want bigger products to give more points. |
| 7 | A batch has at most 1,000 codes. Points per code, reward cost and reward stock are limited to 1,000,000. | Keeps pages fast and prevents absurd values from breaking totals (a bug I found, see `AI_LOG.md`). |
| 8 | The owner prints codes by downloading a batch as a CSV file. The app does not connect to any printing or production machine. | Out of scope. A CSV is the simplest handover. |

## Fraud prevention

| # | Assumption | Why |
|---|---|---|
| 9 | A code can be redeemed exactly once, by one customer, forever. | Direct reading of the assignment. |
| 10 | After 5 failed attempts within 15 minutes, a customer cannot submit codes until older failures are more than 15 minutes old. Failed attempts count: invalid, already used, disabled. | Stops guessing and sharing of used codes without punishing a single typing mistake. |
| 11 | Every code submission, good or bad, is stored with the customer, the text entered, the result and the time. | The owner needs evidence to spot fraud. |
| 12 | Login routes allow 30 requests per 15 minutes per IP address. | Slows down password guessing with no extra software. |
| 13 | The owner can disable an unused code and re-enable it. A used code can never be changed. | Lets the owner pull back a lost or stolen batch while keeping history trustworthy. |

## Customers and the admin

| # | Assumption | Why |
|---|---|---|
| 14 | Customers register with name, email and password (minimum 8 characters). There is no email verification and no password reset. | Both need an email service, which is paid or complicated and not in the assignment. |
| 15 | Emails are treated as case-insensitive and must be unique. | Prevents duplicate accounts. |
| 16 | There is exactly one admin account, created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` the first time the app starts. There is no admin registration page. | The client is one factory owner. No public admin sign-up avoids a security hole. |
| 17 | The admin cannot delete customers or codes, only disable them. | Deleting would break the history of points and codes. |
| 18 | A disabled customer is locked out immediately, even if currently logged in. Their points are kept. | Fast response to abuse. |
| 19 | Sessions last 2 hours and are kept in server memory, so restarting the server logs everyone out. | Simple and fine for one small server. A production system would use a persistent session store. |

## Points and rewards

| # | Assumption | Why |
|---|---|---|
| 20 | Points are whole numbers and never expire. | Simplest model. Expiry was not asked for. |
| 21 | A customer's balance is the sum of their transactions (a ledger), not a separately stored number. | The balance can never get out of sync with the history. |
| 22 | A reward has a points cost and a stock count. Redeeming spends the points and reduces stock immediately. The owner can hide a reward. | Matches "manage available rewards" and stops over-redeeming. |
| 23 | The app records that a reward was redeemed (shown as a points transaction). Delivering the physical reward is handled by the factory outside the app. | A shipping and fulfilment workflow was not requested. |

## Dashboard meaning

| # | Assumption | Why |
|---|---|---|
| 24 | "Submitted codes" counts every submission attempt, including failed ones. "Redeemed codes" counts only successful ones. | The assignment lists both. Showing both lets the owner compare good and bad attempts. |
| 25 | "Points awarded" is the total of all points ever earned. Points spent on rewards are shown separately. | Keeps the two numbers easy to understand. |

## Technical decisions

| # | Assumption | Why |
|---|---|---|
| 26 | The database is one SQLite file, using Node's built-in `node:sqlite`. | The first plan used `better-sqlite3`, but the laptop runs Node v25.1.0, a non-LTS version where native add-ons often fail to install on Windows. The built-in module needs nothing installed. |
| 27 | Passwords are hashed with `scrypt` from Node's built-in `crypto`, not `bcryptjs`. | Equally standard for password hashing and needs no extra package. |
| 28 | Express 4 is used, not the newest Express. | Very widely documented and simpler for a beginner to explain. |
| 29 | Frontend is React with Bootstrap. | The student chose React over plain JavaScript. Bootstrap gives a clean, responsive look without writing much CSS. |
| 30 | The app runs as one server instance for one factory. Times are stored in UTC and shown in the browser's local time. | Matches the scale of the assignment. |
| 31 | The cookie `secure` flag is only turned on when `NODE_ENV=production`, because local testing uses plain HTTP. | Secure cookies would not work on `http://localhost`. |
| 32 | Browsers used are modern desktop and mobile browsers. | Needed by React and Bootstrap 5. |
