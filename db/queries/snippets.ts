import db from "../connection.ts";
import type { Snippet, SnippetWithTags, CreateSnippetInput, UpdateSnippetInput } from "../../src/types/index.ts";
import { getTagsForSnippet, attachTagsToSnippet } from "./tags.ts";

// ─── Prepared Statements ─────────────────────────────────────

const insertStmt = db.prepare(`
    INSERT INTO snippets (title, snippet, extension)
    VALUES (@title, @snippet, @extension)
`);

const getByIdStmt = db.prepare(`
    SELECT * FROM snippets WHERE id = ?
`);

const getAllStmt = db.prepare(`
    SELECT * FROM snippets ORDER BY updated_at DESC
`);

const getCountPerExtensionStmt = db.prepare(`
    SELECT extension, COUNT(*) AS count FROM snippets 
    WHERE extension <> ''
    GROUP BY extension;
`);

const getRecentStmt = db.prepare(`
    SELECT * FROM snippets 
    ORDER BY updated_at DESC
    LIMIT ?
`);

const getByExtensionStmt = db.prepare(`
    SELECT * FROM snippets WHERE extension = ? ORDER BY updated_at DESC
`);

const searchStmt = db.prepare(`
    SELECT snippets.* FROM snippets
    JOIN snippets_fts ON snippets.id = snippets_fts.rowid
    WHERE snippets_fts MATCH @query
    ORDER BY rank
`);

const updateTitleStmt = db.prepare(`UPDATE snippets SET title = ?, updated_at = datetime('now') WHERE id = ?`);
const updateSnippetStmt = db.prepare(`UPDATE snippets SET snippet = ?, updated_at = datetime('now') WHERE id = ?`);
const updateExtensionStmt = db.prepare(`UPDATE snippets SET extension = ?, updated_at = datetime('now') WHERE id = ?`);

const deleteByTitleStmt = db.prepare(`DELETE FROM snippets WHERE title = ?`);

const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM snippets
`);


export function createSnippet(input: CreateSnippetInput): SnippetWithTags {
    const txn = db.transaction(() => {
        const result = insertStmt.run({
            title: input.title,
            snippet: input.snippet,
            extension: input.extension,
        });

        const snippetId = result.lastInsertRowid as number;

        // Attach tags if provided
        if (input.tags && input.tags.length > 0) {
            attachTagsToSnippet(snippetId, input.tags);
        }

        return getSnippetById(snippetId)!;
    });

    return txn();
}

export function getSnippetById(id: number): SnippetWithTags | undefined {
    const row = getByIdStmt.get(id) as Snippet | undefined;
    if (!row) return undefined;

    return {
        ...row,
        tags: getTagsForSnippet(row.id),
    };
}

export function getAllSnippets(): SnippetWithTags[] {
    const rows = getAllStmt.all() as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function getRecentSnippets(limit?: string): SnippetWithTags[] {
    const rows = getRecentStmt.all(limit) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));

}

export function searchSnippets(query: string): SnippetWithTags[] {
    const formattedQuery = query.trim().split(/\s+/).map(w => w.endsWith('*') ? w : w + '*').join(' ');
    const rows = searchStmt.all({ query: formattedQuery }) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function getSnippetsByExtension(extension: string): SnippetWithTags[] {
    const rows = getByExtensionStmt.all(extension) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function getCountPerExtension(){
    const rows = getCountPerExtensionStmt.all() as {extension: string, count: number}[];
    return rows.map((row) => ({
        ...row
    }))
}

export function getFilteredSnippets(filters: {
    ext?: string | string[];
    tags?: string[];
}): SnippetWithTags[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.ext) {
        const exts = Array.isArray(filters.ext) ? filters.ext : [filters.ext];
        const placeholders = exts.map(() => "LOWER(?)").join(", ");
        conditions.push(`LOWER(s.extension) IN (${placeholders})`);
        params.push(...exts);
    }

    if (filters.tags && filters.tags.length > 0) {
        for (const tag of filters.tags) {
            conditions.push(`
                EXISTS (
                    SELECT 1 FROM snippet_tags st
                    JOIN tags t ON t.id = st.tag_id
                    WHERE st.snippet_id = s.id AND LOWER(t.name) = LOWER(?)
                )
            `);
            params.push(tag);
        }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT s.* FROM snippets s ${where} ORDER BY s.updated_at DESC`;

    const rows = db.prepare(sql).all(...params) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function updateSnippet(id: number, input: UpdateSnippetInput): SnippetWithTags | undefined {
    const txn = db.transaction(() => {
        if (input.title !== undefined) {
            updateTitleStmt.run(input.title, id);
        }
        if (input.snippet !== undefined) {
            updateSnippetStmt.run(input.snippet, id);
        }
        if (input.extension !== undefined) {
            updateExtensionStmt.run(input.extension, id);
        }
        return getSnippetById(id);
    });

    return txn();
}

export function deleteSnippet(title: string): boolean {
    const result = deleteByTitleStmt.run(title);
    return result.changes > 0;
}

export function countSnippets(): number {
    const row = countStmt.get() as { count: number };
    return row.count;
}
