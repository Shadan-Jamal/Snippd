import { Router, type Request, type Response } from "express";
import { generateEmbedding } from "../../src/commands/ai/util.ts";
import { searchByEmbedding, countIndexed } from "../../db/queries/embeddings.ts";
import { countSnippets } from "../../db/queries/snippets.ts";
import { assertIndexCompatibleWithConfig, reindexAllSnippets } from "../../src/utils/indexSnippet.ts";
import { renderAiSearchResultsHtml, renderAiStatusHtml } from "../utils/aiTemplateUtil.ts";

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
        return res.status(500).json({ error: String(error) });
    }
});

aiRouter.get("/status", (_req: Request, res: Response) => {
    try {
        const indexed = countIndexed();
        const total = countSnippets();
        const compat = assertIndexCompatibleWithConfig();
        
        return res.json({
            indexed,
            total,
            compat,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: String(error) });
    }
});

export default aiRouter;
