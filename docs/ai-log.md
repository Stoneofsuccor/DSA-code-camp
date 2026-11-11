*(Note: If you view this file on GitHub later, GitHub will automatically turn those Mermaid blocks into beautiful flowcharts!)*

---

### 📄 2. `docs/ai-log.md` (Required for EVERY Build)
**What is it?**
As stated in your course README: *"The AI writing the code is not the skill being graded. The skill is knowing what to ask for, and knowing whether what came back is correct."* Your instructor wants a log of what you asked the AI, what it gave you, and what you had to fix.

**How to create it:**
1. Inside your `docs` folder, create a file named `ai-log.md`.
2. Open it and paste this (I have filled it out based on what we just did!):

```markdown
# AI Log

## Build 1 & 2 & 3

### Prompt 1: Initial Domain Setup
- **What I asked:** Create the domain rules, waitlist queue, and inventory for Build 1.
- **What came back:** The initial files for errors, ids, waitlist, and inventory.
- **What was wrong:** The first `inventory.js` had a duplicate `createEvent` function which caused a `SyntaxError`. I deleted the old one and kept the updated version.

### Prompt 2: Build 3 Server
- **What I asked:** Add the HTTP router, server, state machine, and tests.
- **What came back:** The router, server, and 22 passing tests.
- **What was wrong:** The server crashed with `ERR_HTTP_HEADERS_SENT` when hitting an unknown API route because the router wasn't returning `true` after sending a 404. I fixed the router to return `true`, and added a check `if (!res.headersSent)` in the server error handler to prevent crashes.

## Build 4

### Prompt 1: Build 4 REST API
- **What I asked:** Build the in-memory REST API, separating routes from rules using services and repositories, and add the mock payment gateway.
- **What came back:** The repository, services, gateway, updated server with routes, and API tests.
- **What was wrong (or "nothing"):** Nothing was functionally wrong. However, when testing with `curl`, I had to ensure the server was running in a separate terminal before making requests. I also verified the `PAYMENT_DECLINED` logic by adding a tier that costs exactly 999 cents.

## Build 5

### Prompt 1 & 2: SQLite and Overselling Fix
- **What I asked:** Move the in-memory repository to SQLite, create the schema with constraints, and fix the overselling bug using an atomic database update.
- **What came back:** The schema, connection, SQLite repository, and the oversell demo script and test.
- **What was wrong (or "nothing"):** The first time I ran `npm start`, I got an `EADDRINUSE` error because my old server was still running. I also had a missing import for `createEventService` in `server.js` which caused a `ReferenceError`. Both were fixed quickly. The atomic update works perfectly. If a JS lock variable was used, the event loop would still allow multiple requests to pass the check before the deduction, which is why we do it in the database.

## Build 6

### Prompt 1: Frontend on mock data
- **What I asked:** Create the HTML, CSS, and ES modules for the frontend, using mock data for events and payments.
- **What came back:** The DOM structure, styles, API mock layer, and UI logic for home and event pages.
- **What was wrong (or "nothing"):** The initial static file server code triggered a `FORBIDDEN` error on Windows due to path normalization. I fixed this by using `normalize()` and `resolve()` in `app.js`. I also had a typo in my `styles.css` filename which the server logs helped me find.