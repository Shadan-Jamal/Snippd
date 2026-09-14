import { Router, type Request, type Response } from "express";
import { getAllSnippets, getSnippetById } from "../../db/queries/index.ts";
import { getFilteredSnippets, searchSnippets } from "../../db/queries/snippets.ts";
import { renderSnippetHtml, renderSnippetsHtml, renderSearchResultsHtml } from "../utils/templates.ts";

const snippetsRouter = Router();

snippetsRouter.get("/", (_req: Request, res: Response) => {
    try {
        const snippets = getAllSnippets();
        return res.type("html").send(renderSnippetsHtml(snippets ?? []));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderSnippetsHtml([]));
    }
});

snippetsRouter.post("/filter", (req: Request, res: Response) => {
    try {
        const { ext, tags } = req.body;
        const transformedExt = ext ? String(ext).split(",").map((e: string) => e.trim()).filter(Boolean) : [];
        const transformedTags = tags ? String(tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [];

        const snippets = getFilteredSnippets({ ext: transformedExt, tags: transformedTags });
        return res.type("html").send(renderSnippetsHtml(snippets ?? []));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderSnippetsHtml([]));
    }
});

snippetsRouter.get("/:id", (req: Request, res: Response) => {
    try {
        const id = Number.parseInt(String(req.params.id), 10);
        if (!Number.isFinite(id)) {
            return res.type("html").send(renderSnippetHtml(null));
        }

        const snippet = getSnippetById(id);
        if (!snippet) {
            return res.type("html").send(renderSnippetHtml(null));
        }
        return res.type("html").send(renderSnippetHtml(snippet));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderSnippetHtml(null));
    }
});

// TODO: Replace POST with QUERY
snippetsRouter.post("/search", (req: Request, res: Response) => {
    try {
        console.log(req.body);
        const { query } = req.body;
        const results = searchSnippets(query);
        const html = renderSearchResultsHtml(query, results);
        return res.type("html").send(html);
    } catch (error) {
        console.error(error);
        return res.type("html").send(`<p class="text-ink-muted text-sm px-4 py-3">Search failed.</p>`);
    }
});

export default snippetsRouter;
