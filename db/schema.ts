import type Database from "better-sqlite3";

/**
 * Tables
 * ──────
 *  snippets             Main table storing code snippets.
 *  tags                 Unique tag names.
 *  snippet_tags         Junction table (many-to-many) linking snippets ↔ tags.
 *  containers           Named snippet stashes.
 *  container_snippets   Junction table linking containers ↔ snippets.
 *  embedding_meta       Active embedding model + dimension for vec_snippets.
 *
 * vec_snippets (sqlite-vec vec0) is created lazily once the embedding
 * dimension is known — see db/queries/embeddings.ts.
 *
 * Relationships
 * ─────────────
 *  One snippet can have many tags, and one tag can belong to many snippets.
 *  Deleting a snippet cascades to its entries in snippet_tags / container_snippets.
 *  Deleting a tag / container cascades to its junction rows.
 */
export function initSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS snippets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL UNIQUE,
            code     TEXT    NOT NULL,
            extension    TEXT    NOT NULL DEFAULT 'txt',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tags (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT    NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS containers (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT    NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS container_snippets (
            container_id INTEGER NOT NULL,
            snippet_id   INTEGER NOT NULL,
            added_at     TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (container_id, snippet_id),
            FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
            FOREIGN KEY (snippet_id)   REFERENCES snippets(id)   ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS snippet_tags (
            snippet_id INTEGER NOT NULL,
            tag_id     INTEGER NOT NULL,
            PRIMARY KEY (snippet_id, tag_id),
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id)     REFERENCES tags(id)     ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS embedding_meta (
            id         INTEGER PRIMARY KEY CHECK (id = 1),
            model      TEXT    NOT NULL,
            dim        INTEGER NOT NULL,
            updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS snippets_fts
        USING fts5(title, code, extension, content=snippets, content_rowid=id);

        -- Triggers to keep FTS5 table in sync with snippets table
        CREATE TRIGGER IF NOT EXISTS snippets_ai AFTER INSERT ON snippets BEGIN
            INSERT INTO snippets_fts(rowid, title, code, extension)
            VALUES (new.id, new.title, new.code, new.extension);
        END;

        CREATE TRIGGER IF NOT EXISTS snippets_ad AFTER DELETE ON snippets BEGIN
            INSERT INTO snippets_fts(snippets_fts, rowid, title, code, extension)
            VALUES ('delete', old.id, old.title, old.code, old.extension);
        END;

        CREATE TRIGGER IF NOT EXISTS snippets_au AFTER UPDATE ON snippets BEGIN
            INSERT INTO snippets_fts(snippets_fts, rowid, title, code, extension)
            VALUES ('delete', old.id, old.title, old.code, old.extension);
            INSERT INTO snippets_fts(rowid, title, code, extension)
            VALUES (new.id, new.title, new.code, new.extension);
        END;
    `);
}
