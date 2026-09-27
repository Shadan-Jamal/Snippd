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

const getContainerByIdStmt = db.prepare(`
    SELECT * FROM containers
    WHERE id = ?
`);

const getContainerByNameStmt = db.prepare(`
    SELECT * FROM containers
    WHERE name = ?
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

export function getContainerByName(name: string): Container | undefined {
    const result = getContainerByNameStmt.get(name);
    if (!result) {
        throw new Error("Container not found");
    }
    return result as Container;
}

export function getContainerSnippets(containerId: number): SnippetWithTags[] {
    const rows = getContainerSnippetsStmt.all(containerId) as Snippet[];
    return rows.map((row) => ({
        ...row,
        tags: getTagsForSnippet(row.id),
    }));
}