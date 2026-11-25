# Testing

This project has two kinds of tests: automated tests and a manual test plan.

## 1. Automated tests

Run them with:

```
npm test
```

They use Node's built-in test runner and test the real logic against a fresh in-memory SQLite database for every test, so tests never affect each other. They cover registration and login, code generation, code redemption, fraud rules (reuse, invalid, disabled, lockout), reward redemption, and the admin dashboard queries.

**Actual result:** 28 tests, 28 passed, 0 failed.
Run environment: Node.js v22.23.5 (Linux), run by the AI assistant while building the project.

| # | Test | Result |
|---|---|---|
| 1 | dashboard stats match what really happened | Pass |
| 2 | customer dashboard shows balance, totals and history (newest first) | Pass |
| 3 | a customer only sees their own transactions | Pass |
| 4 | admin can search customers and disable them | Pass |
| 5 | code list filters by status, searches, and shows who redeemed | Pass |
| 6 | admin can disable and re-enable unused codes, but never change a used code | Pass |
| 7 | batch list, CSV export, attempts and transactions monitoring | Pass |
| 8 | registration stores a hashed password, not plain text | Pass |
| 9 | registration rejects duplicate email, bad email and short password | Pass |
| 10 | login works with the right password and fails with the wrong one | Pass |
| 11 | a customer cannot log in as admin, and the admin is created from env values | Pass |
| 12 | a batch generates the requested number of unique, well-formed codes | Pass |
| 13 | batch validation rejects bad input | Pass |
| 14 | the database itself refuses two identical codes | Pass |
| 15 | a valid code awards points and shows in the history | Pass |
| 16 | lowercase and no-dash input is accepted | Pass |
| 17 | the same customer cannot reuse a code | Pass |
| 18 | a different customer cannot use a code that is already used | Pass |
| 19 | invalid codes give an error and award nothing | Pass |
| 20 | a disabled code cannot be redeemed | Pass |
| 21 | the database blocks a second flip of a used code (the WHERE status guard) | Pass |
| 22 | 5 wrong attempts lock the customer out, even for a real code | Pass |
| 23 | every attempt, good or bad, is logged | Pass |
| 24 | redeeming a reward reduces points and stock and is recorded | Pass |
| 25 | rewards cannot be redeemed without enough points, stock, or when inactive | Pass |
| 26 | reward validation and active-only listing | Pass |
| 27 | login for an unknown email is not instantly fast (no timing leak of registered emails) | Pass |
| 28 | absurdly large point values are rejected | Pass |

**Student's own run on Windows (Node v25.1.0):** `npm test` result: loyalty-rewards@1.0.0 test
> node --test

(node:3448) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
✔ dashboard stats match what really happened (82.8069ms)
✔ customer dashboard shows balance, totals and history (newest first) (79.1301ms)
✔ a customer only sees their own transactions (78.5043ms)
✔ admin can search customers and disable them (154.1418ms)
✔ code list filters by status, searches, and shows who redeemed (77.6662ms)
✔ admin can disable and re-enable unused codes, but never change a used code (79.5972ms)
✔ batch list, CSV export, attempts and transactions monitoring (79.4657ms)
(node:17688) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
✔ registration stores a hashed password, not plain text (85.4135ms)
✔ registration rejects duplicate email, bad email and short password (118.81ms)
✔ login works with the right password and fails with the wrong one (191.1774ms)
✔ a customer cannot log in as admin, and the admin is created from env values (199.7177ms)
✔ a batch generates the requested number of unique, well-formed codes (92.2438ms)
✔ batch validation rejects bad input (80.0694ms)
✔ the database itself refuses two identical codes (74.0825ms)
✔ a valid code awards points and shows in the history (75.6851ms)
✔ lowercase and no-dash input is accepted (73.4405ms)
✔ the same customer cannot reuse a code (75.2743ms)
✔ a different customer cannot use a code that is already used (81.6622ms)
✔ invalid codes give an error and award nothing (76.4313ms)
✔ a disabled code cannot be redeemed (94.7557ms)
✔ the database blocks a second flip of a used code (the WHERE status guard) (80.4981ms)
✔ 5 wrong attempts lock the customer out, even for a real code (73.8904ms)
✔ every attempt, good or bad, is logged (72.7748ms)
✔ redeeming a reward reduces points and stock and is recorded (82.7963ms)
✔ rewards cannot be redeemed without enough points, stock, or when inactive (118.0367ms)
✔ reward validation and active-only listing (72.689ms)
✔ login for an unknown email is not instantly fast (no timing leak of registered emails) (113.4653ms)
✔ absurdly large point values are rejected (82.0319ms)
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2553.1307

The last two tests were added after a code review found real problems (see `AI_LOG.md`, entries 7 and 8).

### What the automated tests do not cover

The Express routes and the React pages are tested by the manual plan below, because testing them automatically needs extra tools (a browser test tool). The logic behind every route is covered by the automated tests.

## 2. Manual test plan and results

Environment: Windows laptop, Node.js v25.1.0, started with `npm run setup` then `npm start`, opened at http://localhost:3000.
Date: 24 November 2026. Tester: the student.
Note: this run happened before the two security fixes in `AI_LOG.md` entries 7 and 8. Those fixes are covered by automated tests. A quick re-check of items 1 to 4 after updating the code is recommended.

| # | Test | Steps | Expected result | Actual result |
|---|---|---|---|---|
| 1 | Admin login | Open `/admin/login`, sign in with the `.env` email and password | Admin dashboard with statistic cards | Pass |
| 2 | Generate codes | Codes page, generate 5 codes of 100 points | Codes listed, CSV download works | Pass |
| 3 | Customer redeems a valid code | Register a customer, submit a generated code | "You earned 100 points", balance is 100 | Pass |
| 4 | Reuse by the same customer | Submit the same code again | Error: code has already been used | Pass |
| 5 | Reuse by a different customer | Register a second customer, submit the same code | Same "already used" error, no points | Pass |
| 6 | Invalid codes and lockout | Submit `AAAA-BBBB-CCCC` five times, then a real unused code | Errors, then locked out for 15 minutes | Pass |
| 7 | Reward redemption | Admin adds a reward, customer redeems it | Points and stock go down, history shows the spend | Pass |
| 8 | Disable a customer | Admin disables a customer | That customer can no longer log in | Pass |
| 9 | Monitoring | Open the Monitoring page | Every attempt and transaction above is listed | Pass |

Results for this table were reported by the student after running the checks ("all manual checks passed").

### Suggested extra manual checks (not yet run)

| # | Test | Expected result |
|---|---|---|
| 10 | Open the site on a phone or narrow browser window | Menu collapses, pages stay readable |
| 11 | Try opening `/admin` while logged in as a customer | Redirected to the admin login page |
| 12 | Disable an unused code in the admin, then submit it as a customer | Error: code has been disabled |
| 13 | Register with an email that already exists | Error: account already exists |
