
-- 1. Create Watchlist Table
CREATE TABLE watchlist (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  seasons INTEGER,
  episodes INTEGER,
  length TEXT,
  genre TEXT,
  rating TEXT,
  finishedDate TEXT,
  thumbnail TEXT,
  status TEXT NOT NULL,
  review TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Discussions Table
CREATE TABLE discussions (
  id UUID PRIMARY KEY,
  userName TEXT NOT NULL,
  userAvatar TEXT,
  topic TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes INTEGER DEFAULT 0
);

-- 3. Create Recommendations Table
CREATE TABLE recommendations (
  id UUID PRIMARY KEY,
  userName TEXT NOT NULL,
  userAvatar TEXT,
  movieTitle TEXT NOT NULL,
  comment TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes INTEGER DEFAULT 0
);

-- Enable RLS (Optional but recommended for production)
-- For now, you can keep it simple or set public access policies in the Supabase Dashboard.
