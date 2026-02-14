import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, "freckle.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    runMigrations(db);

    // Clean expired stats cache on startup
    try {
      db.prepare("DELETE FROM stats_cache WHERE expires_at < ?").run(new Date().toISOString());
    } catch {
      // stats_cache table may not exist yet
    }
  }
  return db;
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      applied_at  TEXT NOT NULL
    )
  `);

  const applied = new Set(
    database
      .prepare("SELECT name FROM _migrations")
      .all()
      .map((row) => (row as { name: string }).name)
  );

  const migrationsDir = path.join(__dirname, "migrations");

  // In bundled environments __dirname may not point to source.
  // Fall back to scanning from process.cwd() if the dir doesn't exist.
  const resolvedDir = fs.existsSync(migrationsDir)
    ? migrationsDir
    : path.join(process.cwd(), "src", "lib", "db", "migrations");

  if (!fs.existsSync(resolvedDir)) {
    return;
  }

  const files = fs
    .readdirSync(resolvedDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(resolvedDir, file), "utf-8");

    database.transaction(() => {
      database.exec(sql);
      database
        .prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)")
        .run(file, new Date().toISOString());
    })();
  }
}
