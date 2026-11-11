PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  venue TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'))
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_in_cents INTEGER NOT NULL CHECK (price_in_cents >= 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  sold INTEGER NOT NULL DEFAULT 0,
  -- THIS IS THE DATABASE SAFETY NET: It is physically impossible to oversell.
  CHECK (sold >= 0 AND sold <= capacity),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  reference TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (tier_id) REFERENCES ticket_tiers(id)
);