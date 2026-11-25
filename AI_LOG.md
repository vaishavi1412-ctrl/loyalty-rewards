# AI Log

This log records the key interactions with the AI assistant (Claude) while building the project. The AI wrote the first version of the code, and I directed it, ran it, and checked its work. Prompts are quoted from the real conversation (the first one is shortened). Mistakes are recorded as they actually happened.

**Summary:** 9 entries. Entries 5, 7 and 8 are cases where the AI was wrong.

---

## 1. Starting brief and stack proposal

**My prompt (shortened):** I have no application or code. Create the whole "Customer Loyalty Rewards System" assignment from scratch. Follow the PDF exactly, use a beginner-friendly free stack that runs on Windows, explain in simple English, work step by step, and do not invent AI-log entries.

**What the AI did:** It proposed plain HTML/CSS/JS, Node.js + Express, SQLite via `better-sqlite3`, a project structure, and answers to the three assignment questions. It said it would not write code until I approved.

**What I did with it:** I read the plan, checked it matched the PDF, and answered its question about my Node version.

---

## 2. Adjusting the plan to my laptop

**My prompt:** `v25.1.0` (the output of `node -v`)

**What the AI did:** It warned that Node 25 is not an LTS version and that `better-sqlite3` (a native add-on) often fails to install on Windows with such versions. It proposed switching to the SQLite built into Node (`node:sqlite`). It said this was a plan adjustment, not a mistake, and that a real failure would be logged only if it happened.

**Result:** The database library was changed before any code was written, so `npm install` never failed on this issue. Recorded in `ASSUMPTIONS.md` (#26).

---

## 3. Choosing the frontend

**My prompts:** "which other language we can use for fronted", then "change frontend to react or bootstrap", then "use react and then approved"

**What the AI did:** It explained that browsers only run HTML, CSS and JavaScript, and compared plain JS, EJS, Bootstrap, TypeScript, Vue, React and Angular. It recommended plain JS + Bootstrap because it would be easiest to explain in a live demo. When I chose React, it said the choice was fine, proposed React + Bootstrap styling, and noted the extra setup.

**Result:** I overruled the AI's recommendation because I wanted to use React, and the AI adapted the plan. Recorded in `ASSUMPTIONS.md` (#29).

---

## 4. Core logic first, with tests

**My prompt:** (approval above, then) "continue"

**What the AI did:** It built the database schema and the fraud logic (code generation, redemption in a single transaction, lockout, rewards) together with automated tests before any web pages. It chose Node's built-in `scrypt` for passwords instead of the planned `bcryptjs`, and told me about the change.

**Result:** 19 tests passed on the first run. The change to `scrypt` is recorded in `ASSUMPTIONS.md` (#27). I should be able to explain the three layers of protection: the `UNIQUE` code, the `UPDATE ... WHERE status = 'unused'` check, and the single transaction.

---

## 5. AI MISTAKE 1: folder creation silently failed

**What happened:** The AI ran one command to create the folders `src/services` and `tests` using the shortcut `{src/services,tests}`. The shell it used does not support that shortcut.

**How it was noticed:** The command's error output said "Directory nonexistent" for three files, and a folder literally named `{src` appeared in the file listing.

**How it was fixed:** The AI deleted the stray folder, created the folders with separate plain commands, and re-created the files. Nothing was lost, because the failed command had created no useful files.

**Lesson:** Do not assume a command shortcut works in every shell. Always read the error output.

---

## 6. Building the API and React pages without being able to run them

**My prompt:** "continue"

**What the AI did:** It wrote the Express API and the React + Bootstrap pages. It told me clearly that its workspace had no internet, so it could not install Express or React, and that only the logic layer had been tested. It put as much logic as possible into plain service files that it could test, and kept the route files thin. It then gave me exact Windows steps and a manual test checklist.

**Result:** I ran `npm run setup` and `npm start` and worked through the checklist. My reply: "it works and all munual checks passed". See `TESTING.md`.

---

## 7. AI MISTAKE 2: login revealed which emails are registered

**What happened:** In its own first version of `login()`, the AI wrote `if (!user || !verifyPassword(...))`. When the email does not exist, the slow password check is skipped.

**How it was noticed:** After everything worked, the AI reviewed its own code for security weaknesses and wrote a small script to measure it. Logging in with an existing email took about **39 ms**, but an unknown email took about **0.02 ms**. An attacker could use that difference to find out which customers are registered.

**How it was fixed:** The AI now always runs the password check, using a dummy hash when the email is unknown. After the fix the times were about 40 ms and 38 ms. A regression test was added ("login for an unknown email is not instantly fast").

**Note:** I did not spot this myself. The AI found it, and I should be able to explain it, and re-run `npm test` to see the test pass.

---

## 8. AI MISTAKE 3: no upper limit on numbers

**What happened:** The AI validated that points and stock were whole numbers of at least 1, but set no maximum.

**How it was noticed:** In the same review, the AI tested extreme input. The app accepted a code worth `1e300` points (the customer's balance became `1e+300`) and a reward costing `1e300` points. That would corrupt every total on the dashboard.

**How it was fixed:** A limit of 1,000,000 was added for points per code, reward cost and stock, in both the code generator and the reward service. A regression test ("absurdly large point values are rejected") was added. Recorded in `ASSUMPTIONS.md` (#7).

**Lesson:** Check the top end of a number, not only the bottom.

---

## 9. Final verification and documentation

**What happened:** After the two fixes, the AI re-ran all tests (28 of 28 passed) and wrote the README, ASSUMPTIONS, ARCHITECTURE and TESTING files. I reviewed them against the assignment PDF to make sure each requirement has a matching section.

**Result:** Documentation complete. The manual test results in `TESTING.md` were reported by me from my own run, and I should re-check the main flows after updating to the fixed code.
