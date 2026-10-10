import { Router, type Request, type Response } from "express";
import {
    createSnippet,
    deleteSnippetById,
    deleteSnippetsByIds,
    getCountPerExtension,
    getRecentSnippets,
    getSnippetByIdentifier,
    getSnippetsByExtension,
    searchSnippets,
} from "../../db/queries/snippets.ts";
import { searchSnippetsByFields, type SearchOptions } from "../../src/utils/searchUtil.ts";
import {
    renderExtensionCountsHtml,
    renderExtensionSnippetsHtml,
    renderRecentSnippetsHtml,
    renderSearchResultsHtml,
    renderSnippetHtml,
} from "../utils/snippetTemplateUtil.ts";
import { parseId, parseIds, parseLimit, parseList, renderPagedSnippetList } from "../utils/misc.ts";

const snippetsRouter = Router();

snippetsRouter.get("/", (req: Request, res: Response) => {
    try {
        return res.type("html").send(renderPagedSnippetList(req.query));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderPagedSnippetList({ page: 1, limit: 25 }));
    }
});

snippetsRouter.post("/filter", (req: Request, res: Response) => {
    try {
        return res.type("html").send(renderPagedSnippetList({ ...req.body, page: 1 }));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderPagedSnippetList({ page: 1, limit: req.body?.limit }));
    }
});

snippetsRouter.get("/recent", (req: Request, res: Response) => {
    try {
        const limit = parseLimit(req.query.limit);
        const snippets = getRecentSnippets(String(limit));
        return res.type("html").send(renderRecentSnippetsHtml(snippets ?? []));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderRecentSnippetsHtml([]));
    }
});

snippetsRouter.get("/extensions", (req: Request, res: Response) => {
    try {
        const q = String(req.query.q ?? "").trim().toLowerCase().replace(/^\./, "");
        let counts = getCountPerExtension() ?? [];
        if (q) {
            counts = counts.filter(({ extension }) =>
                extension.toLowerCase().replace(/^\./, "").includes(q),
            );
        }
        return res.type("html").send(renderExtensionCountsHtml(counts, q || undefined));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderExtensionCountsHtml([]));
    }
});

snippetsRouter.get("/extensions/:ext", (req: Request, res: Response) => {
    try {
        const ext = String(req.params.ext ?? "").trim();
        const snippets = ext ? getSnippetsByExtension(ext) : [];
        return res.type("html").send(renderExtensionSnippetsHtml(ext || "unknown", snippets ?? []));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderExtensionSnippetsHtml("unknown", []));
    }
});

// TODO: Replace POST with QUERY
snippetsRouter.post("/search", (req: Request, res: Response) => {
    try {
        const { query, title, content, ext, tags } = req.body;

        const searchOptions: SearchOptions = {
            title: title === "true",
            content: content === "true",
            ext: ext === "true",
            tags: tags === "true",
        };

        const results = searchSnippetsByFields(query, searchOptions);
        const html = renderSearchResultsHtml(query, results);
        return res.type("html").send(html);
    } catch (error) {
        console.error(error);
        return res.type("html").send(`<p class="text-ink-muted text-sm px-4 py-3">Search failed.</p>`);
    }
});

snippetsRouter.post("/new", (req: Request, res: Response) => {
    try {
        const { title, snippet, extension, tags } = req.body;
        const tranformedTags = parseList(tags);
        const resSnippet = createSnippet({ title, snippet, extension, tags: tranformedTags });
        return res.type("html").send(`
            <div id="save-form-response" hx-swap-oob="true" class="flex items-center gap-3 pt-1">
                <p class="text-green-500/50 text-sm px-4 py-3">Snippet created successfully.</p>
                <a href="snippet.html?id=${resSnippet.id}" class="text-sm text-ink-muted hover:text-ink">View snippet</a>
                <a href="new.html" class="text-sm text-ink-muted hover:text-ink">Create another snippet</a>
            </div>
        `);
    } catch (error) {
        console.error("error creating snippet", error);
        return res.type("html").send(`
            <div id="save-form-response" hx-swap-oob="true" class="flex items-center gap-3 pt-1">
                <p class="text-red-500/50 text-sm px-4 py-3">Snippet creation failed. ${String(error)}</p>
            </div>
        `);
    }
});

snippetsRouter.post("/delete", (req: Request, res: Response) => {
    try {
        const ids = parseIds(req.body.ids);
        deleteSnippetsByIds(ids);

        const view = String(req.body.view ?? "list");
        if (view === "recent") {
            const limit = parseLimit(req.body.limit);
            return res.type("html").send(renderRecentSnippetsHtml(getRecentSnippets(String(limit)) ?? []));
        }
        if (view === "search") {
            const query = String(req.body.query ?? "");
            const results = query.trim() ? searchSnippets(query) : [];
            return res.type("html").send(renderSearchResultsHtml(query, results));
        }

        return res.type("html").send(renderPagedSnippetList(req.body));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Delete failed.</p>`);
    }
});

snippetsRouter.post("/:id/delete", (req: Request, res: Response) => {
    try {
        const id = parseId(req.params.id);
        if (!id || !deleteSnippetById(id)) {
            return res.status(404).type("html").send(`<p class="px-4 py-8 text-sm text-ink-muted">Snippet not found.</p>`);
        }
        res.set("HX-Redirect", "/ui/index.html");
        return res.status(200).send("");
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-8 text-sm text-danger">Delete failed.</p>`);
    }
});

snippetsRouter.get("/:id", (req: Request, res: Response) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.type("html").send(renderSnippetHtml(null));
        }

        const snippet = getSnippetByIdentifier(id);
        if (!snippet) {
            return res.type("html").send(renderSnippetHtml(null));
        }
        return res.type("html").send(renderSnippetHtml(snippet));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderSnippetHtml(null));
    }
});

export default snippetsRouter;
