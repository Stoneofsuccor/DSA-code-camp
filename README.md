# Event Management: Course Capstone

**Organizers publish events. Attendees buy tickets. Staff check people in with QR codes.**

You will build a full-stack ticketing platform over nine weekly Build sessions, using an AI coding tool as your partner. The app looks simple on the surface. It hides three hard problems, and solving them well is what this project is about.

## The three hard problems

1. **Overselling.** One ticket is left and fifty people press Buy at the same moment. Exactly one of them must get it.
2. **Refunds.** When someone cancels, how much money goes back depends on how close the event is, and the seats must be released exactly once.
3. **Waitlists.** When an event is sold out and a seat frees up, the person who has waited longest is offered it, for a limited time, and then it passes to the next person.

## What you will build

| Role | What they can do |
|---|---|
| **Organizer** | Create, edit and publish events and ticket tiers. See bookings for their own events only. |
| **Attendee** | Browse and search events, book tickets, pay (mock payment), cancel and get a refund, join waitlists, see their own tickets. |
| **Staff** | Scan tickets at the door for events they are assigned to. Nothing else. |

The finished project has a website (HTML, CSS, JavaScript), a JavaScript API, and a database. Payments are simulated: no real money moves.

## How the course works

Every Build session has four steps:

1. **Gap lesson.** Your instructor teaches the things you have not been taught yet but need for this build.
2. **Prompt and build.** You give your AI tool a clear description of the milestone and the rules, and let it write a first draft.
3. **Review.** You read the code, run it, and decide what is wrong. You fix it, and you tell the AI why it was wrong.
4. **Ship.** You commit on a branch named `build-N`, open a pull request into `main`, and merge it.

**The AI writing the code is not the skill being graded.** The skill is knowing what to ask for, and knowing whether what came back is correct.

### The AI log

Keep a file called `docs/ai-log.md`. For every important prompt, write:

- what you asked,
- what came back,
- what was wrong with it (or "nothing"), and what you changed.

You will add at least one entry in every build. It counts toward your grade.

## The nine Build classes

The capstone is built in nine Build classes, one milestone each. Every class follows the same four steps: a short gap lesson, prompt and build, review, ship.

| Build | Class | You deliver | New ideas taught first |
| --- | --- | --- | --- |
| 1 | Domain core in the terminal | Events, ticket tiers, bookings with a capacity rule, a first-in-first-out waitlist, fast lookup by reference | Running Node, modules, `Map`, classes, errors, money as whole cents, Big O |
| 2 | Search, sorting and the first tests | Search, filter and sort events with your own merge sort, the backlog as user stories, the first automated tests | `node:test`, pure functions, comparators, stability, user stories and acceptance criteria |
| 3 | Architecture, state machine and server skeleton | A layered design, the booking life cycle as a state machine, a web server with `/health` and static files | HTTP requests and responses, status codes, routers, state machines, diagrams |
| 4 | A working REST API (in memory) | Create, publish, search, book, pay (mock) and cancel through an API | `async`/`await`, dependency injection, repositories, REST design |
| 5 | SQLite and the overselling fix | Data in SQLite, and the last-ticket problem reproduced and then fixed | SQL, atomic updates, constraints, parameterised queries, concurrency |
| 6 | Frontend on mock data | Browse, filter, view an event, choose tickets, check out with a countdown, mock card payment | The DOM, forms, ES modules in the browser, accessibility basics |
| 7 | Login, roles and a connected app | Signup and login, three roles, private data, the website talking to the real API | `fetch`, password hashing, tokens, authentication versus authorization |
| 8 | Refunds, waitlist, expiry and a real test suite | A refund policy, cancelling, waitlist offers with a time limit, unpaid bookings that expire, a debugging exercise | A controllable clock in tests, boundary cases, testing concurrency, debugging method, scheduled jobs |
| 9 | QR check-in, CI and security | Signed QR tickets, staff check-in, forged and repeated scans rejected, security headers, rate limiting, tests on every push, a demo-ready project | Signing versus encrypting, GitHub Actions, security headers, secrets |

The three hard problems arrive where you would expect: overselling in Build 5, and refunds and waitlists in Build 8.

For every Build class, work on a branch named `build-N` (for example `build-2`), open a pull request into `main`, and merge it.

## Stack

- **Frontend:** HTML, CSS, JavaScript (no framework)
- **Backend:** Node.js 22.13 or newer, JavaScript API
- **Database:** SQLite
- **Tests:** Node's built-in test runner
- No outside packages are needed. Check your Node version with `node --version`.

## Getting Started

To run this project locally:

```bash
git clone https://github.com/Stoneofsuccor/DSA-code-camp.git
cd DSA-code-camp
