import { Router, type Request, type Response } from "express";
import { generateEmbedding } from "../../src/commands/ai/util.ts";
import { searchByEmbedding, countIndexed } from "../../db/queries/embeddings.ts";
import { countSnippets } from "../../db/queries/snippets.ts";
import { assertIndexCompatibleWithConfig, reindexAllSnippets } from "../../src/utils/indexSnippet.ts";
import { renderAiSearchResultsHtml, renderAiStatusHtml } from "../utils/aiTemplateUtil.ts";
import { readOllamaConfig } from "@/src/config/ollamaConfig.ts";

const aiRouter = Router();

aiRouter.post("/search", async (req: Request, res: Response) => {
    try {
        const { query, limit } = req.body;
        
        if (!query || typeof query !== "string") {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Query is required.</p>`);
        }

        const compat = assertIndexCompatibleWithConfig();
        if (!compat.ok) {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">${compat.reason}</p>`);
        }

        if (countIndexed() === 0) {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Embedding index is empty. Run reindex first.</p>`);
        }

        const k = Math.max(1, Number.parseInt(String(limit) || "10", 10));
        const vector = await generateEmbedding(query.trim());
        
        if (!vector) {
            return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Could not embed query.</p>`);
        }

        const results = searchByEmbedding(vector, k);
        return res.type("html").send(renderAiSearchResultsHtml(query, results));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">AI search failed: ${String(error)}</p>`);
    }
});

aiRouter.post("/reindex", async (_req: Request, res: Response) => {
    try {
        const result = await reindexAllSnippets();
        return res.json(result);
    } catch (error) {
        console.error(error);
        const errorMessage = String(error);
        if (errorMessage.includes("Ollama is not available") || errorMessage.includes("embedding model is not available")) {
            return res.status(500).type("html").send(`
                <div class="px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <p class="text-sm text-red-500">Ollama is not running or the embedding model is not available.</p>
                    <p class="text-xs text-red-400 mt-1">Make sure Ollama is running and the model is pulled: <code class="font-mono">ollama pull nomic-embed-text</code></p>
                </div>
            `);
        }
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Reindex failed: ${errorMessage}</p>`);
    }
});

aiRouter.get("/status", (_req: Request, res: Response) => {
    try {
        const indexed = countIndexed();
        const total = countSnippets();
        const compat = assertIndexCompatibleWithConfig();
        const model = readOllamaConfig()?.model;
        return res.type("html").send(`
        <p className="text-red-500 font-medium">Indexed: ${indexed}</p    
        <p className="text-white font-medium">Total: ${total}</p    
        <p className="text-white font-medium">Model: ${model}</p    
        <p className="font-medium ${compat.ok ? "text-green-500" : "text-red-700"}">Model Compatible: ${compat.ok ? "Yes" : `No, ${compat.reason}`}</p    
        `);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: String(error) });
    }
});

export default aiRouter;
