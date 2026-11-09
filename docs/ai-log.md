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