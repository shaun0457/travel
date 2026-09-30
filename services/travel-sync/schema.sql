CREATE TABLE IF NOT EXISTS trip_state (
  trip_id TEXT NOT NULL,
  sync_hash TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (trip_id, sync_hash, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_state_lookup
ON trip_state (trip_id, sync_hash, updated_at);
