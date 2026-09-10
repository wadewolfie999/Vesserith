CREATE TABLE orientation (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 revision INTEGER NOT NULL CHECK (revision >= 1),
 document TEXT NOT NULL CHECK (json_valid(document)),
 updated_at TEXT NOT NULL
);
CREATE TABLE activity (
 id INTEGER PRIMARY KEY,
 revision INTEGER NOT NULL UNIQUE,
 recorded_at TEXT NOT NULL,
 reason TEXT NOT NULL,
 document TEXT NOT NULL CHECK (json_valid(document))
);
