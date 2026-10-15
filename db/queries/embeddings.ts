import db from "../connection.ts";
import type { EmbeddingMeta, Snippet, SnippetWithDistance } from "../../src/types/index.ts";
import { getTagsForSnippet } from "./tags.ts";

const VEC_TABLE = "vec_snippets";

const getMetaStmt = db.prepare(`
    SELECT model, dim, updated_at FROM embedding_meta WHERE id = 1
`);

const setMetaStmt = db.prepare(`
    INSERT INTO embedding_meta (id, model, dim, updated_at)
    VALUES (1, @model, @dim, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
        model = excluded.model,
        dim = excluded.dim,
        updated_at = datetime('now')
`);

const clearMetaStmt = db.prepare(`DELETE FROM embedding_meta WHERE id = 1`);

function tableExists(name: string): boolean {
    const row = db
        .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?`)
        .get(name) as { ok: number } | undefined;
    return Boolean(row);
}

export function getEmbeddingMeta(): EmbeddingMeta | undefined {
    const row = getMetaStmt.get() as EmbeddingMeta | undefined;
    return row;
}

export function setEmbeddingMeta(model: string, dim: number): void {
    setMetaStmt.run({ model, dim });
}

export function clearEmbeddingMeta(): void {
    clearMetaStmt.run();
}

export function ensureVecTable(dim: number): void {
    if (!Number.isFinite(dim) || dim <= 0) {
        throw new Error(`Invalid embedding dimension: ${dim}`);
    }

    const meta = getEmbeddingMeta();
    if (tableExists(VEC_TABLE)) {
        if (meta && meta.dim === dim) return;
        db.exec(`DROP TABLE IF EXISTS ${VEC_TABLE}`);
        clearEmbeddingMeta();
    }

    const safeDim = Math.floor(dim);
    db.exec(`
        CREATE VIRTUAL TABLE ${VEC_TABLE} USING vec0(
            embedding float[${safeDim}]
        )
    `);
}

export function upsertSnippetEmbedding(snippetId: number, embedding: Float32Array): void {
    ensureVecTable(embedding.length);
    const del = db.prepare(`DELETE FROM ${VEC_TABLE} WHERE rowid = ?`);
    const ins = db.prepare(`INSERT INTO ${VEC_TABLE}(rowid, embedding) VALUES (?, ?)`);
    // better-sqlite3 binds JS numbers as REAL; vec0 requires strict INTEGER rowids → BigInt
    const txn = db.transaction(() => {
        del.run(BigInt(snippetId));
        ins.run(BigInt(snippetId), embedding);
    });
    txn();
}

export function deleteSnippetEmbedding(snippetId: number): void {
    if (!tableExists(VEC_TABLE)) return;
    db.prepare(`DELETE FROM ${VEC_TABLE} WHERE rowid = ?`).run(BigInt(snippetId));
}

export function countIndexed(): number {
    if (!tableExists(VEC_TABLE)) return 0;
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${VEC_TABLE}`).get() as { count: number };
    return row.count;
}

export function listUnindexedSnippetIds(): number[] {
    if (!tableExists(VEC_TABLE)) {
        return (db.prepare(`SELECT id FROM snippets ORDER BY id`).all() as { id: number }[]).map((r) => r.id);
    }
    const rows = db.prepare(`
        SELECT id FROM snippets
        WHERE id NOT IN (SELECT rowid FROM ${VEC_TABLE})
        ORDER BY id
    `).all() as { id: number }[];
    return rows.map((r) => r.id);
}

export function searchByEmbedding(queryVec: Float32Array, k: number): SnippetWithDistance[] {
    if (!tableExists(VEC_TABLE)) return [];

    const limit = Math.max(1, Math.floor(k));

    const rows = db.prepare(`
        WITH knn AS (
            SELECT rowid, distance
            FROM ${VEC_TABLE}
            WHERE embedding MATCH ?
              AND k = ?
        )
        SELECT s.*, knn.distance AS distance
        FROM knn
        JOIN snippets s ON s.id = knn.rowid
        ORDER BY knn.distance
    `).all(queryVec, limit) as (Snippet & { distance: number })[];

    return rows.map((row) => {
        const { distance, ...snippet } = row;
        return {
            ...snippet,
            tags: getTagsForSnippet(snippet.id),
            distance,
        };
    });
}

export function dropVecIndex(): void {
    if (tableExists(VEC_TABLE)) {
        db.exec(`DROP TABLE IF EXISTS ${VEC_TABLE}`);
    }
    clearEmbeddingMeta();
}
