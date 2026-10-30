import { Router, type Request, type Response } from "express";
import {
    createSnippet,
    createSnippets,
    FILE_SAVE_LIMIT,
    deleteSnippetById,
    deleteSnippetsByIds,
    getCountPerExtension,
    getRecentSnippets,
    getSnippetByIdentifier,
    getSnippetsByExtension,
    updateSnippet,
} from "../../db/queries/snippets.ts";
import { setTagsForSnippet } from "../../db/queries/tags.ts";
import { searchSnippetsByFields, type SearchOptions } from "../../src/commands/search/util.ts";
import {
    renderExtensionCountsHtml,
    renderExtensionSnippetsHtml,
    renderRecentSnippetsHtml,
    renderSearchResultsHtml,
    renderSnippetHtml,
} from "../utils/snippetTemplateUtil.ts";
import { parseId, parseIds, parseLimit, parseList, renderPagedSnippetList } from "../utils/misc.ts";
import { escapeHtml } from "../utils/snippetTemplateUtil.ts";

function searchOptionsFromBody(body: Record<string, unknown>): SearchOptions {
    return {
        title: body.title === "true",
        content: body.content === "true",
        ext: body.ext === "true",
        tags: body.tags === "true",
    };
}

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
        const q = String(req.query.query ?? req.query.q ?? "").trim().toLowerCase();
        const snippets = getRecentSnippets(String(limit), q) ?? [];
        return res.type("html").send(renderRecentSnippetsHtml(snippets));
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
        const query = String(req.body.query ?? "");
        const results = searchSnippetsByFields(query, searchOptionsFromBody(req.body));
        const html = renderSearchResultsHtml(query, results);
        return res.type("html").send(html);
    } catch (error) {
        console.error(error);
        return res.type("html").send(`<p class="text-ink-muted text-sm px-4 py-3">Search failed.</p>`);
    }
});

snippetsRouter.post("/new", (req: Request, res: Response) => {
    try {
        if (Array.isArray(req.body.snippets)) {
            return res.type("html").send(createSnippetsFromBody(req.body.snippets));
        }

        const { title, code, extension, tags } = req.body;
        const tranformedTags = parseList(tags);
        const resSnippet = createSnippet({ title, code, extension, tags: tranformedTags });
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
                <p class="text-red-500/50 text-sm px-4 py-3">Snippet creation failed. ${escapeHtml(String(error))}</p>
            </div>
        `);
    }
});

function createSnippetsFromBody(raw: unknown[]): string {
    if (raw.length > FILE_SAVE_LIMIT) {
        return `
            <div id="save-form-response" hx-swap-oob="true" class="flex items-center gap-3 pt-1">
                <p class="text-red-500/50 text-sm px-4 py-3">Too many files (${raw.length}). The limit is ${FILE_SAVE_LIMIT}.</p>
            </div>
        `;
    }

    const ready: { title: string; code: string; extension: string; tags: string[] }[] = [];
    const rejected: string[] = [];

    for (const item of raw) {
        const row = item as { title?: unknown; code?: unknown; extension?: unknown; tags?: unknown };
        const title = String(row.title ?? "").trim();
        const code = String(row.code ?? "");
        const extension = String(row.extension ?? "").trim() || "txt";
        if (!title || !code.trim() || code.includes("\0")) {
            rejected.push(title || "(unnamed)");
            continue;
        }
        ready.push({ title, code, extension, tags: parseList(row.tags) });
    }

    const result = ready.length > 0
        ? createSnippets(ready)
        : { created: [], failed: [] };

    const failures = [
        ...rejected.map((name) => `${name}: could not read file`),
        ...result.failed.map((item) => item.message),
    ];
    const failureHtml = failures.length
        ? `<ul class="text-sm text-red-500/70 px-4">${failures.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
        : "";

    return `
        <div id="save-form-response" hx-swap-oob="true" class="flex flex-col items-start gap-2 pt-1">
            <p class="text-green-500/50 text-sm px-4 py-3">Saved ${result.created.length} snippet${result.created.length === 1 ? "" : "s"}.</p>
            ${failureHtml}
            <a href="index.html" class="text-sm text-ink-muted hover:text-ink px-4">View snippets</a>
        </div>
    `;
}

snippetsRouter.post("/delete", (req: Request, res: Response) => {
    try {
        const ids = parseIds(req.body.ids);
        deleteSnippetsByIds(ids);

        const view = String(req.body.view ?? "list");
        if (view === "recent") {
            const limit = parseLimit(req.body.limit);
            const query = String(req.body.query ?? "").trim();
            return res.type("html").send(renderRecentSnippetsHtml(getRecentSnippets(String(limit), query) ?? []));
        }
        if (view === "search") {
            const query = String(req.body.query ?? "");
            const results = query.trim()
                ? searchSnippetsByFields(query, searchOptionsFromBody(req.body))
                : [];
            return res.type("html").send(renderSearchResultsHtml(query, results));
        }

        return res.type("html").send(renderPagedSnippetList(req.body));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Delete failed.</p>`);
    }
});

snippetsRouter.post("/:id", (req: Request, res: Response) => {
    try {
        const id = parseId(req.params.id);
        if (!id) {
            return res.status(404).type("html").send(renderSnippetHtml(null));
        }

        const existing = getSnippetByIdentifier(id);
        if (!existing) {
            return res.status(404).type("html").send(renderSnippetHtml(null));
        }

        const title = String(req.body.title ?? existing.title).trim();
        const code = String(req.body.code ?? existing.code);
        const extension = String(req.body.ext ?? req.body.extension ?? existing.extension).trim() || "txt";
        const tags = parseList(req.body.tags);

        if (!title || !code.trim()) {
            return res.status(400).type("html").send(`
                <p class="px-4 py-8 text-sm text-danger">Title and code are required.</p>
            `);
        }

        updateSnippet(id, { title, code, extension });
        setTagsForSnippet(id, tags);

        const updated = getSnippetByIdentifier(id);
        return res.type("html").send(renderSnippetHtml(updated ?? null));
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : String(error);
        const safe = message.includes("UNIQUE")
            ? "A snippet with that title already exists."
            : "Failed to update snippet.";
        return res.status(500).type("html").send(`<p class="px-4 py-8 text-sm text-danger">${safe}</p>`);
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
