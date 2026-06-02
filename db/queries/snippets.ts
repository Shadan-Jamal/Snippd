import db from "../connection.ts";
import type { Snippet, SnippetWithTags, CreateSnippetInput, UpdateSnippetInput } from "../../types/index.ts";
import { getTagsForSnippet, attachTagsToSnippet } from "./tags.ts";

// ─── Prepared Statements ─────────────────────────────────────

const insertStmt = db.prepare(`
    INSERT INTO snippets (title, snippet, language)
    VALUES (@title, @snippet, @language)
`);

const getByIdStmt = db.prepare(`
    SELECT * FROM snippets WHERE id = ?
`);

const getAllStmt = db.prepare(`
    SELECT * FROM snippets ORDER BY updated_at DESC
`);

const searchStmt = db.prepare(`
    SELECT * FROM snippets
    WHERE title    LIKE '%' || @query || '%'
       OR snippet     LIKE '%' || @query || '%'
       OR language LIKE '%' || @query || '%'
    ORDER BY updated_at DESC
`);

const getByLanguageStmt = db.prepare(`
    SELECT * FROM snippets WHERE language = ? ORDER BY updated_at DESC
`);

const updateTitleStmt = db.prepare(`UPDATE snippets SET title = ?, updated_at = datetime('now') WHERE id = ?`);
const updateSnippetStmt = db.prepare(`UPDATE snippets SET snippet = ?, updated_at = datetime('now') WHERE id = ?`);
const updateLanguageStmt = db.prepare(`UPDATE snippets SET language = ?, updated_at = datetime('now') WHERE id = ?`);

const deleteStmt = db.prepare(`
    DELETE FROM snippets WHERE id = ?
`);

const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM snippets
`);

// ─── DML Functions

export function createSnippet(input: CreateSnippetInput): SnippetWithTags {
    const txn = db.transaction(() => {
        const result = insertStmt.run({
            title: input.title,
            snippet: input.snippet,
            language: input.language,
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

export function searchSnippets(query: string): SnippetWithTags[] {
    const rows = searchStmt.all({ query }) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function getSnippetsByLanguage(language: string): SnippetWithTags[] {
    const rows = getByLanguageStmt.all(language) as Snippet[];
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
        if (input.language !== undefined) {
            updateLanguageStmt.run(input.language, id);
        }
        return getSnippetById(id);
    });

    return txn();
}

export function deleteSnippet(id: number): boolean {
    const result = deleteStmt.run(id);
    return result.changes > 0;
}

export function countSnippets(): number {
    const row = countStmt.get() as { count: number };
    return row.count;
}
