import type Database from "better-sqlite3";

/**
 * Tables
 * ──────
 *  snippets        Main table storing code snippets.
 *  tags            Unique tag names.
 *  snippet_tags    Junction table (many-to-many) linking snippets ↔ tags.
 *
 * Relationships
 * ─────────────
 *  One snippet can have many tags, and one tag can belong to many snippets.
 *  Deleting a snippet cascades to its entries in snippet_tags.
 *  Deleting a tag   cascades to its entries in snippet_tags.
 */
export function initSchema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS snippets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL,
            snippet        TEXT    NOT NULL,
            language    TEXT    NOT NULL DEFAULT 'plaintext',
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tags (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT    NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS snippet_tags (
            snippet_id INTEGER NOT NULL,
            tag_id     INTEGER NOT NULL,
            PRIMARY KEY (snippet_id, tag_id),
            FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id)     REFERENCES tags(id)     ON DELETE CASCADE
        );
    `);
}
