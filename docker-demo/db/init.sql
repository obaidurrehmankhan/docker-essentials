CREATE TABLE IF NOT EXISTS visits (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);
