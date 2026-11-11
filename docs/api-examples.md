# API Examples

All requests that modify a booking require an `x-user-id` header to identify the user.

### 1. Create an Event (Organizer)
```bash
curl -X POST http://localhost:3000/api/events \
-H "Content-Type: application/json" \
-d '{"title":"Tech Meetup","city":"Lagos","venue":"Hall A","date":"2026-12-05T17:00:00Z"}'