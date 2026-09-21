import { Router, type Request, type Response } from "express";
import {
    createSnippet,
    deleteSnippetById,
    deleteSnippetsByIds,
    getAllSnippets,
    getCountPerExtension,
    getFilteredSnippets,
    getRecentSnippets,
    getSnippetByIdentifier,
    getSnippetsByExtension,
    searchSnippets,
} from "../../db/queries/snippets.ts";
import {
    renderExtensionCountsHtml,
    renderExtensionSnippetsHtml,
    renderRecentSnippetsHtml,
    renderSearchResultsHtml,
    renderSnippetHtml,
    renderSnippetsHtml,
} from "../utils/templates.ts";

const snippetsRouter = Router();

function parseIds(raw: unknown): number[] {
    const values = Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw];
    return [...new Set(
        values
            .map((value) => Number.parseInt(String(value), 10))
            .filter((id) => Number.isFinite(id) && id > 0),
    )];
}

function parseList(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map((value) => String(value).trim()).filter(Boolean);
    }
    return raw ? String(raw).split(",").map((value) => value.trim()).filter(Boolean) : [];
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

function parsePageSize(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? 25), 10);
    return (PAGE_SIZES as readonly number[]).includes(parsed) ? parsed : 25;
}

function parsePage(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? 1), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseLimit(value: unknown, fallback = 30): number {
    const parsed = Number.parseInt(String(value ?? fallback), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(200, Math.max(1, parsed));
}

function renderPagedSnippetList(source: { ext?: unknown; tags?: unknown; page?: unknown; limit?: unknown }): string {
    const ext = parseList(source.ext);
    const tags = parseList(source.tags);
    const perPage = parsePageSize(source.limit);
    const requestedPage = parsePage(source.page);
    const all = ext.length || tags.length
        ? getFilteredSnippets({ ext, tags })
        : getAllSnippets();
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * perPage;

    return renderSnippetsHtml({
        snippets: all.slice(start, start + perPage),
        total,
        page,
        perPage,
        totalPages,
    });
}

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
        const { query } = req.body;
        const results = searchSnippets(query);
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
        const tranformedTags = tags ? String(tags).split(",").map((t: string) => t.trim()).filter(Boolean) : [];
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

        const ext = parseList(req.body.ext);
        const tags = parseList(req.body.tags);
        return res.type("html").send(renderPagedSnippetList({
            ext,
            tags,
            page: req.body.page,
            limit: req.body.limit,
        }));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Delete failed.</p>`);
    }
});

snippetsRouter.post("/:id/delete", (req: Request, res: Response) => {
    try {
        const id = Number.parseInt(String(req.params.id), 10);
        if (!Number.isFinite(id) || !deleteSnippetById(id)) {
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
        const id = Number.parseInt(String(req.params.id), 10);
        if (!Number.isFinite(id)) {
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
