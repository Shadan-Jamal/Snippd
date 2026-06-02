import db from "../connection.ts";
import type { Tag } from "../../types/index.ts";

// ─── Prepared Statements 

const insertTagStmt = db.prepare(`
    INSERT OR IGNORE INTO tags (name) VALUES (?)
`);

const getTagByNameStmt = db.prepare(`
    SELECT * FROM tags WHERE name = ?
`);

const getTagByIdStmt = db.prepare(`
    SELECT * FROM tags WHERE id = ?
`);

const getAllTagsStmt = db.prepare(`
    SELECT * FROM tags ORDER BY name ASC
`);

const getTagsForSnippetStmt = db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN snippet_tags st ON st.tag_id = t.id
    WHERE st.snippet_id = ?
    ORDER BY t.name ASC
`);

const getSnippetIdsByTagStmt = db.prepare(`
    SELECT snippet_id FROM snippet_tags WHERE tag_id = ?
`);

const linkStmt = db.prepare(`
    INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)
`);

const unlinkStmt = db.prepare(`
    DELETE FROM snippet_tags WHERE snippet_id = ? AND tag_id = ?
`);

const unlinkAllForSnippetStmt = db.prepare(`
    DELETE FROM snippet_tags WHERE snippet_id = ?
`);

const deleteTagStmt = db.prepare(`
    DELETE FROM tags WHERE id = ?
`);

const countTagsStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tags
`);

// ─── DML Functions

export function getOrCreateTag(name: string): Tag {
    const normalised = name.trim().toLowerCase();
    insertTagStmt.run(normalised);
    return getTagByNameStmt.get(normalised) as Tag;
}

export function attachTagsToSnippet(snippetId: number, tagNames: string[]): void {
    const txn = db.transaction(() => {
        for (const name of tagNames) {
            const tag = getOrCreateTag(name);
            linkStmt.run(snippetId, tag.id);
        }
    });
    txn();
}

export function setTagsForSnippet(snippetId: number, tagNames: string[]): void {
    const txn = db.transaction(() => {
        unlinkAllForSnippetStmt.run(snippetId);
        for (const name of tagNames) {
            const tag = getOrCreateTag(name);
            linkStmt.run(snippetId, tag.id);
        }
    });
    txn();
}

export function removeTagFromSnippet(snippetId: number, tagName: string): boolean {
    const tag = getTagByNameStmt.get(tagName.trim().toLowerCase()) as Tag | undefined;
    if (!tag) return false;

    const result = unlinkStmt.run(snippetId, tag.id);
    return result.changes > 0;
}

export function getTagsForSnippet(snippetId: number): Tag[] {
    return getTagsForSnippetStmt.all(snippetId) as Tag[];
}

export function getTagById(id: number): Tag | undefined {
    return getTagByIdStmt.get(id) as Tag | undefined;
}

export function getTagByName(name: string): Tag | undefined {
    return getTagByNameStmt.get(name.trim().toLowerCase()) as Tag | undefined;
}

export function getAllTags(): Tag[] {
    return getAllTagsStmt.all() as Tag[];
}

export function getSnippetIdsByTag(tagName: string): number[] {
    const tag = getTagByNameStmt.get(tagName.trim().toLowerCase()) as Tag | undefined;
    if (!tag) return [];

    const rows = getSnippetIdsByTagStmt.all(tag.id) as { snippet_id: number }[];
    return rows.map((r) => r.snippet_id);
}

export function deleteTag(id: number): boolean {
    const result = deleteTagStmt.run(id);
    return result.changes > 0;
}

export function countTags(): number {
    const row = countTagsStmt.get() as { count: number };
    return row.count;
}