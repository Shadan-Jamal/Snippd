import {
    deleteSnippetEmbedding,
    dropVecIndex,
    ensureVecTable,
    getEmbeddingMeta,
    setEmbeddingMeta,
    upsertSnippetEmbedding,
} from "../../db/queries/embeddings.ts";
import { getAllSnippets, getSnippetByIdentifier } from "../../db/queries/snippets.ts";
import { readOllamaConfig } from "../config/ollamaConfig.ts";
import {
    buildEmbedText,
    checkOllamaAvailable,
    ensureConfiguredModelAvailable,
    generateEmbedding,
    generateEmbeddingsBatch,
} from "../commands/ai/util.ts";

/** Snippets per Ollama /api/embed call during reindex. */
const REINDEX_BATCH_SIZE = 16;

export function assertIndexCompatibleWithConfig(): { ok: true } | { ok: false; reason: string } {
    const config = readOllamaConfig();
    const model = config?.model?.trim();
    if (!model) {
        return { ok: false, reason: "OLLAMA_MODEL is not configured. Run: snippd config set OLLAMA_MODEL <model-name>" };
    }

    const meta = getEmbeddingMeta();
    if (!meta) {
        return { ok: false, reason: 'No embedding index yet. Run: snippd ai reindex' };
    }

    if (meta.model !== model) {
        return {
            ok: false,
            reason: `Index was built with model "${meta.model}" but config has "${model}". Run: snippd ai reindex`,
        };
    }

    return { ok: true };
}

export async function indexSnippet(snippetId: number): Promise<boolean> {
    if (!(await checkOllamaAvailable())) return false;
    if (!(await ensureConfiguredModelAvailable())) return false;

    const config = readOllamaConfig();
    const model = config?.model?.trim();
    if (!model) return false;

    const meta = getEmbeddingMeta();
    if (meta && meta.model !== model) {
        // Model changed — caller should reindex; skip silent partial writes.
        return false;
    }

    const snippet = getSnippetByIdentifier(snippetId);
    if (!snippet) return false;

    const vector = await generateEmbedding(buildEmbedText(snippet));
    if (!vector) return false;

    if (meta && meta.dim !== vector.length) {
        return false;
    }

    ensureVecTable(vector.length);
    upsertSnippetEmbedding(snippetId, vector);

    if (!getEmbeddingMeta()) {
        setEmbeddingMeta(model, vector.length);
    }

    return true;
}

export function scheduleIndexSnippet(snippetId: number): void {
    void indexSnippet(snippetId).catch(() => {});
}

export function removeSnippetFromIndex(snippetId: number): void {
    deleteSnippetEmbedding(snippetId);
}

async function embedBatchWithFallback(
    texts: string[],
): Promise<(Float32Array | undefined)[]> {
    const batch = await generateEmbeddingsBatch(texts);
    if (batch) return batch;

    // Whole batch failed — retry one-by-one so a single bad item doesn't drop the chunk.
    const results: (Float32Array | undefined)[] = [];
    for (const text of texts) {
        results.push(await generateEmbedding(text));
    }
    return results;
}

export async function reindexAllSnippets(
    onProgress?: (done: number, total: number, title: string) => void,
): Promise<{ indexed: number; failed: number; total: number }> {
    if (!(await checkOllamaAvailable())) {
        throw new Error("Ollama is not available");
    }
    if (!(await ensureConfiguredModelAvailable())) {
        throw new Error("Configured embedding model is not available");
    }

    const config = readOllamaConfig();
    const model = config?.model?.trim();
    if (!model) throw new Error("OLLAMA_MODEL is not configured");

    const snippets = getAllSnippets();
    if (snippets.length === 0) {
        dropVecIndex();
        return { indexed: 0, failed: 0, total: 0 };
    }

    const texts = snippets.map((s) => buildEmbedText(s));

    // Probe dim from the first batch, then rebuild the vec table cleanly.
    const probeBatch = await embedBatchWithFallback(texts.slice(0, Math.min(REINDEX_BATCH_SIZE, texts.length)));
    const firstVec = probeBatch.find((v) => v && v.length > 0);
    if (!firstVec) throw new Error("Failed to generate embeddings for the first batch");

    dropVecIndex();
    ensureVecTable(firstVec.length);
    setEmbeddingMeta(model, firstVec.length);

    let indexed = 0;
    let failed = 0;
    let done = 0;

    for (let start = 0; start < snippets.length; start += REINDEX_BATCH_SIZE) {
        const end = Math.min(start + REINDEX_BATCH_SIZE, snippets.length);
        const slice = snippets.slice(start, end);
        const sliceTexts = texts.slice(start, end);

        const vectors = start === 0
            ? probeBatch
            : await embedBatchWithFallback(sliceTexts);

        for (let j = 0; j < slice.length; j++) {
            const snippet = slice[j]!;
            done++;
            onProgress?.(done, snippets.length, snippet.title);

            const vector = vectors[j];
            if (!vector || vector.length !== firstVec.length) {
                failed++;
                continue;
            }

            try {
                upsertSnippetEmbedding(snippet.id, vector);
                indexed++;
            } catch {
                failed++;
            }
        }
    }

    return { indexed, failed, total: snippets.length };
}
