import Database from "better-sqlite3";
import fs from "fs";
import { config } from "../utils/config.ts";
import { initSchema } from "./schema.ts";

// Create the data directory if it doesn't exist yet
fs.mkdirSync(config.dataDir, { recursive: true });

const db: Database.Database = new Database(config.dbPath);

// ── Pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema 
initSchema(db);

export default db;
