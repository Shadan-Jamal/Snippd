import chalk from "chalk";
import type { Container, CreateContainerInput, Snippet, SnippetWithTags } from "../../src/types/index.ts";
import db from "../connection.ts";
import { getTagsForSnippet } from "./tags.ts";

// ─── Prepared Statements ─────────────────────────────────────

const createContainerStmt = db.prepare(`
    INSERT INTO containers (name, description)
    VALUES (@name, @description)
`);

const deleteContainerStmt = db.prepare(`
    DELETE FROM containers
    WHERE containers.name = ?
`);

const addSnippetToContainerStmt = db.prepare(`
    INSERT INTO container_snippets (container_id, snippet_id)
    VALUES (@container_id, @snippet_id)
`);

const getAllContainersStmt = db.prepare(`
    SELECT * FROM containers
    ORDER BY created_at DESC
`);

const searchContainersStmt = db.prepare(`
    SELECT * FROM containers
    WHERE LOWER(COALESCE(name, '')) LIKE LOWER(?) OR LOWER(COALESCE(description, '')) LIKE LOWER(?)
    ORDER BY updated_at DESC
`);

const getContainerByIdStmt = db.prepare(`
    SELECT * FROM containers
    WHERE id = ?
`);

const getContainerByNameStmt = db.prepare(`
    SELECT * FROM containers
    WHERE name = ?
`);

const updateContainerDescStmt = db.prepare(`
    UPDATE containers SET description = ?, updated_at = datetime('now') WHERE id = ?
`);

const updateContainerNameStmt = db.prepare(`
    UPDATE containers SET name = ?, updated_at = datetime('now') WHERE id = ?
`);

const getContainerSnippetsStmt = db.prepare(`
    SELECT snippets.* FROM snippets
    JOIN container_snippets
    ON snippets.id = container_snippets.snippet_id
    WHERE container_snippets.container_id = ?
    ORDER BY container_snippets.added_at DESC;
`);

export function createContainer(input: CreateContainerInput): Container | undefined {
    const result = createContainerStmt.run({
        name: input.name,
        description: input.description,
    });

    const container = getContainerByIdStmt.get(result.lastInsertRowid as number);
    return container as Container | undefined;
}

export function deleteContainer(containerName: string): boolean{
    const res = deleteContainerStmt.run(containerName);
    return res.changes > 0;
}

export function addSnippetToContainer({containerId, snippetId}: {containerId: number, snippetId: number}): void {
    addSnippetToContainerStmt.run({
        container_id: containerId,
        snippet_id: snippetId,
    });
}

export function getAllContainers(): Container[] {
    try{
        return getAllContainersStmt.all() as Container[];
    } catch (error) {
        console.error(chalk.red("Failed to get all containers"));
        console.error(error);
        console.log();
        return [];
    }
}

export function searchContainers(query: string): Container[] {
    const term = query.trim();
    if (!term) return [];

    const pattern = `%${term}%`;
    return searchContainersStmt.all(pattern, pattern) as Container[];
}

export function getContainerByIdentifier(identifier: number | string): Container | undefined {
    let row = getContainerByIdStmt.get(identifier) as Container | undefined;
    if(!row){
        row = getContainerByNameStmt.get(identifier) as Container | undefined;
    }
    return row;
}

export function getContainerSnippets(containerId: number): SnippetWithTags[] {
    const rows = getContainerSnippetsStmt.all(containerId) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function getFilteredContainerSnippets(containerId: number, filters?: {
    ext?: string | string[];
    tags?: string[];
}): SnippetWithTags[] {
    const conditions: string[] = ["cs.container_id = ?"];
    const params: (string | number)[] = [containerId];

    if (filters?.ext && filters.ext.length > 0) {
        const exts = Array.isArray(filters.ext) ? filters.ext : [filters.ext];
        const placeholders = exts.map(() => "LOWER(?)").join(", ");
        conditions.push(`LOWER(s.extension) IN (${placeholders})`);
        params.push(...exts);
    }

    if (filters?.tags && filters.tags.length > 0) {
        for (const tag of filters.tags) {
            conditions.push(`
                EXISTS (
                    SELECT 1 FROM snippet_tags st
                    JOIN tags t ON t.id = st.tag_id
                    WHERE st.snippet_id = s.id AND LOWER(t.name) LIKE LOWER(?)
                )
            `);
            params.push(`%${tag}%`);
        }
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const sql = `
        SELECT s.* FROM snippets s
        JOIN container_snippets cs ON cs.snippet_id = s.id
        ${where}
        ORDER BY cs.added_at DESC
    `;
    const rows = db.prepare(sql).all(...params) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function removeSnippetsFromContainer(containerId: number, snippetIds: number[]): number {
    if (!snippetIds.length) return 0;
    const placeholders = snippetIds.map(() => "?").join(", ");
    const stmt = db.prepare(`
        DELETE FROM container_snippets
        WHERE container_id = ? AND snippet_id IN (${placeholders})
    `);
    const res = stmt.run(containerId, ...snippetIds);
    return res.changes;
}

export function getFilteredAvailableSnippets(containerId: number, filters?: {
    ext?: string | string[];
    tags?: string[];
    q?: string;
}): SnippetWithTags[] {
    const conditions: string[] = [
        "s.id NOT IN (SELECT cs.snippet_id FROM container_snippets cs WHERE cs.container_id = ?)"
    ];
    const params: (string | number)[] = [containerId];

    if (filters?.q && filters.q.trim()) {
        conditions.push("(LOWER(s.title) LIKE LOWER(?) OR LOWER(s.snippet) LIKE LOWER(?))");
        const term = `%${filters.q.trim()}%`;
        params.push(term, term);
    }

    if (filters?.ext && filters.ext.length > 0) {
        const exts = Array.isArray(filters.ext) ? filters.ext : [filters.ext];
        const placeholders = exts.map(() => "LOWER(?)").join(", ");
        conditions.push(`LOWER(s.extension) IN (${placeholders})`);
        params.push(...exts);
    }

    if (filters?.tags && filters.tags.length > 0) {
        for (const tag of filters.tags) {
            conditions.push(`
                EXISTS (
                    SELECT 1 FROM snippet_tags st
                    JOIN tags t ON t.id = st.tag_id
                    WHERE st.snippet_id = s.id AND LOWER(t.name) LIKE LOWER(?)
                )
            `);
            params.push(`%${tag}%`);
        }
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const sql = `
        SELECT s.* FROM snippets s
        ${where}
        ORDER BY s.updated_at DESC
    `;
    const rows = db.prepare(sql).all(...params) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}

export function addSnippetsToContainer(containerId: number, snippetIds: number[]): number {
    if (!snippetIds.length) return 0;
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO container_snippets (container_id, snippet_id)
        VALUES (?, ?)
    `);
    const insertMany = db.transaction((ids: number[]) => {
        let count = 0;
        for (const id of ids) {
            const res = stmt.run(containerId, id);
            count += res.changes;
        }
        return count;
    });
    return insertMany(snippetIds);
}

export function updateContainerDescription(id: number, description: string): boolean {
    const result = updateContainerDescStmt.run(description, id);
    return result.changes > 0;
}

export function updateContainerName(id: number, newName: string): boolean {
    const result = updateContainerNameStmt.run(newName, id);
    return result.changes > 0;
}