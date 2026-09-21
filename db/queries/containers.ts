import type { Container, CreateContainerInput } from "../../src/types/index.ts";
import db from "../connection.ts";

// ─── Prepared Statements ─────────────────────────────────────

const createContainerStmt = db.prepare(`
    INSERT INTO containers (name, description)
    VALUES (@name, @description)
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

export function createContainer(input: CreateContainerInput): Container | undefined {
    const result = createContainerStmt.run({
        name: input.name,
        description: input.description,
    });

    const container = getContainerByIdStmt.get(result.lastInsertRowid as number);
    return container as Container | undefined;
}

export function addSnippetToContainer({containerId, snippetId}: {containerId: number, snippetId: number}): void {
    addSnippetToContainerStmt.run({
        container_id: containerId,
        snippet_id: snippetId,
    });
}

export function getAllContainers(): Container[] {
    return getAllContainersStmt.all() as Container[];
}

export function getContainerByName(name: string): Container | undefined {
    const result = getContainerByNameStmt.get(name);
    if (!result) {
        throw new Error("Container not found");
    }
    return result as Container;
}