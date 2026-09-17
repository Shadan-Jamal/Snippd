import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import db from "./connection.ts";
import { config } from "../src/utils/config.ts";

const REQUIRED_TABLES = ["snippets", "tags", "snippet_tags", "snippets_fts"] as const;

export type ImportMergeResult = {
    mode: "merge";
    source: string;
    liveDb: string;
    inserted: number;
    updated: number;
    unchanged: number;
    tagsAdded: number;
    linksAdded: number;
};

export function defaultExportPath(): string {
    const stamp = new Date().toISOString().slice(0, 10);
    return path.join(config.dataDir, `snippd-backup-${stamp}.db`);
}

export function resolveDbPath(filePath: string): string {
    return path.resolve(filePath);
}

function assertSafeDestination(dest: string): void {
    const resolvedDest = path.resolve(dest);
    const liveDb = path.resolve(config.dbPath);
    if (resolvedDest === liveDb) {
        throw new Error("Refuse to overwrite the live database path. Choose a different file.");
    }
}

function validateBackupFile(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    let sourceDb: Database.Database | undefined;
    try {
        sourceDb = new Database(filePath, { readonly: true, fileMustExist: true });
        const tables = new Set(
            (sourceDb.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as { name: string }[])
                .map((row) => row.name),
        );

        for (const table of REQUIRED_TABLES) {
            if (!tables.has(table)) {
                throw new Error(`Not a valid Snippd backup (missing table: ${table}).`);
            }
        }
    } finally {
        sourceDb?.close();
    }
}

function ensureLiveDatabase(): void {
    fs.mkdirSync(config.dataDir, { recursive: true });
    if (!fs.existsSync(config.dbPath)) {
        throw new Error(`Live database missing at ${config.dbPath}. Run any Snippd command once to initialize it.`);
    }
}

/** Write a consistent copy of the live DB to `destination`. */
export async function exportDatabase(destination = defaultExportPath()): Promise<string> {
    const dest = resolveDbPath(destination);
    assertSafeDestination(dest);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    db.pragma("wal_checkpoint(TRUNCATE)");
    await db.backup(dest);
    return dest;
}

/**
 * Merge a backup into the live database (default import behaviour).
 * - New titles are inserted
 * - Same title: incoming wins when its updated_at is newer
 * - Tags and snippet↔tag links are unioned
 */
export function importDatabase(sourcePath: string): ImportMergeResult {
    const source = resolveDbPath(sourcePath);
    validateBackupFile(source);
    ensureLiveDatabase();
    assertSafeDestination(source);

    const liveDb = path.resolve(config.dbPath);

    const beforeTitles = new Map(
        (db.prepare(`SELECT title, updated_at FROM snippets`).all() as { title: string; updated_at: string }[])
            .map((row) => [row.title, row.updated_at] as const),
    );
    const tagsBefore = (db.prepare(`SELECT COUNT(*) AS count FROM tags`).get() as { count: number }).count;
    const linksBefore = (db.prepare(`SELECT COUNT(*) AS count FROM snippet_tags`).get() as { count: number }).count;

    let incomingTitles: { title: string; updated_at: string }[] = [];

    const merge = db.transaction(() => {
        db.prepare(`ATTACH DATABASE ? AS incoming`).run(source);

        try {
            incomingTitles = db.prepare(`
                SELECT title, updated_at FROM incoming.snippets
            `).all() as { title: string; updated_at: string }[];

            db.exec(`
                INSERT OR IGNORE INTO tags (name)
                SELECT name FROM incoming.tags;

                INSERT INTO snippets (title, snippet, extension, created_at, updated_at)
                SELECT title, snippet, extension, created_at, updated_at
                FROM incoming.snippets
                WHERE true
                ON CONFLICT(title) DO UPDATE SET
                    snippet = excluded.snippet,
                    extension = excluded.extension,
                    updated_at = excluded.updated_at,
                    created_at = min(snippets.created_at, excluded.created_at)
                WHERE excluded.updated_at > snippets.updated_at;

                INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id)
                SELECT local_s.id, local_t.id
                FROM incoming.snippet_tags AS ist
                JOIN incoming.snippets AS isn ON isn.id = ist.snippet_id
                JOIN incoming.tags AS it ON it.id = ist.tag_id
                JOIN snippets AS local_s ON local_s.title = isn.title
                JOIN tags AS local_t ON local_t.name = it.name;
            `);
        } finally {
            db.exec(`DETACH DATABASE incoming`);
        }
    });

    merge();

    const afterTitles = new Map(
        (db.prepare(`SELECT title, updated_at FROM snippets`).all() as { title: string; updated_at: string }[])
            .map((row) => [row.title, row.updated_at] as const),
    );

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const { title, updated_at: incomingUpdated } of incomingTitles) {
        const previous = beforeTitles.get(title);
        const after = afterTitles.get(title);
        if (previous === undefined) {
            inserted += 1;
        } else if (after !== previous) {
            updated += 1;
        } else {
            unchanged += 1;
        }
        void incomingUpdated;
    }

    const tagsAfter = (db.prepare(`SELECT COUNT(*) AS count FROM tags`).get() as { count: number }).count;
    const linksAfter = (db.prepare(`SELECT COUNT(*) AS count FROM snippet_tags`).get() as { count: number }).count;

    return {
        mode: "merge",
        source,
        liveDb,
        inserted,
        updated,
        unchanged,
        tagsAdded: Math.max(0, tagsAfter - tagsBefore),
        linksAdded: Math.max(0, linksAfter - linksBefore),
    };
}
