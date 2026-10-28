import db from "../connection.ts";
import type { Tag } from "../../src/types/index.ts";

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

const getTagsWithCountsStmt = db.prepare(`
    SELECT tags.*, COUNT(st.snippet_id) as snippet_count
    FROM tags
    LEFT JOIN snippet_tags st ON tags.id = st.tag_id
    GROUP BY tags.id
    ORDER BY tags.name ASC
`);

const getTagByNameWithCountStmt = db.prepare(`
    SELECT tags.*, COUNT(st.snippet_id) as snippet_count
    FROM tags
    LEFT JOIN snippet_tags st ON tags.id = st.tag_id
    WHERE tags.name = ?
    GROUP BY tags.id
`);

const renameTagStmt = db.prepare(`
    UPDATE tags SET name = ? WHERE id = ?
`);

const touchSnippetStmt = db.prepare(`
    UPDATE snippets SET updated_at = datetime('now') WHERE id = ?
`);

const touchSnippetsForTagStmt = db.prepare(`
    UPDATE snippets
    SET updated_at = datetime('now')
    WHERE id IN (
        SELECT snippet_id FROM snippet_tags WHERE tag_id = ?
    )
`);

// ─── DML Functions

export function getOrCreateTag(name: string): Tag {
    const normalised = name.trim().toLowerCase();
    insertTagStmt.run(normalised);
    return getTagByNameStmt.get(normalised) as Tag;
}

function scheduleIndex(snippetId: number): void {
    void import("../../src/utils/indexSnippet.ts")
        .then(({ scheduleIndexSnippet }) => scheduleIndexSnippet(snippetId))
        .catch((err) => {
            console.error(`Failed to schedule embedding index for snippet ${snippetId}:`, err);
        });
}

export function attachTagsToSnippet(snippetId: number, tagNames: string[]): void {
    const txn = db.transaction(() => {
        let changed = false;
        for (const name of tagNames) {
            const tag = getOrCreateTag(name);
            if (linkStmt.run(snippetId, tag.id).changes > 0) changed = true;
        }
        if (changed) touchSnippetStmt.run(snippetId);
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
    touchSnippetStmt.run(snippetId);
    scheduleIndex(snippetId);
}

export function removeTagFromSnippet(snippetId: number, tagName: string): boolean {
    const tag = getTagByNameStmt.get(tagName.trim().toLowerCase()) as Tag | undefined;
    if (!tag) return false;

    const result = unlinkStmt.run(snippetId, tag.id);
    if (result.changes > 0) {
        touchSnippetStmt.run(snippetId);
        scheduleIndex(snippetId);
    }
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
    const txn = db.transaction(() => {
        const snippetIds = getSnippetIdsByTagStmt.all(id) as { snippet_id: number }[];
        const result = deleteTagStmt.run(id);
        if (result.changes > 0) {
            for (const { snippet_id } of snippetIds) touchSnippetStmt.run(snippet_id);
        }
        return result.changes > 0;
    });
    return txn();
}

export function countTags(): number {
    const row = countTagsStmt.get() as { count: number };
    return row.count;
}

export function getTagsWithCounts(): (Tag & { snippet_count: number })[] {
    return getTagsWithCountsStmt.all() as (Tag & { snippet_count: number })[];
}

export function getTagByNameWithCount(name: string): (Tag & { snippet_count: number }) | undefined {
    return getTagByNameWithCountStmt.get(name.trim().toLowerCase()) as (Tag & { snippet_count: number }) | undefined;
}

export function renameTag(id: number, newName: string): boolean {
    const normalised = newName.trim().toLowerCase();
    const txn = db.transaction(() => {
        const result = renameTagStmt.run(normalised, id);
        if (result.changes > 0) touchSnippetsForTagStmt.run(id);
        return result.changes > 0;
    });
    return txn();
}