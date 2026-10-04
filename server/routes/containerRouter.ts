import { Router, type Request, type Response } from "express";
import {
    getAllContainers,
    getContainerByIdentifier,
    getContainerSnippets,
    createContainer,
    deleteContainer,
    removeSnippetsFromContainer,
    addSnippetsToContainer,
} from "../../db/queries/containers.ts";
import { parseId, parseIds, renderPagedSnippetList, renderPagedAvailableSnippetsList } from "../utils/misc.ts";
import { renderContainerCreateFormHtml, renderContainerCreateResultHtml, renderContainerHeaderHtml, renderContainersHtml } from "../utils/containerTemplateUtil.ts";

const containerRouter = Router();

containerRouter.get("/", (_req: Request, res: Response) => {
    try {
        const containers = getAllContainers();
        res.type("html").send(renderContainersHtml(containers));
    } catch (error) {
        console.error(error);
        res.type("html").send(`
          <p class="px-4 py-3 text-sm text-danger">Failed to load containers: ${String(error)}</p>
        `);
    }
});

containerRouter.get("/create-form", (_req: Request, res: Response) => {
    res.type("html").send(renderContainerCreateFormHtml());
});

containerRouter.get("/:id", (req: Request<{ id: string }>, res: Response) => {
    try {
        const containerId = parseId(req.params.id);
        if (!containerId) {
            return res.status(400).type("html").send(`<p class="text-sm text-danger">Invalid container ID.</p>`);
        }

        const container = getContainerByIdentifier(containerId);
        if (!container) {
            return res.status(404).type("html").send(`<p class="text-sm text-ink-muted">Container not found.</p>`);
        }

        const snippets = getContainerSnippets(containerId);

        if (req.headers.accept?.includes("application/json")) {
            return res.json({
                ...container,
                snippetCount: snippets.length,
            });
        }

        return res.type("html").send(renderContainerHeaderHtml(container, snippets.length));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="text-sm text-danger">Error loading container.</p>`);
    }
});

containerRouter.get("/:id/snippets", (req: Request<{ id: string }>, res: Response) => {
    try {
        const containerId = parseId(req.params.id);
        if (!containerId) {
            return res.status(400).type("html").send(`<p class="px-4 py-8 text-sm text-danger">Invalid container ID.</p>`);
        }

        const container = getContainerByIdentifier(containerId);
        if (!container) {
            return res.status(404).type("html").send(`<p class="px-4 py-8 text-sm text-ink-muted">Container not found.</p>`);
        }

        return res.type("html").send(renderPagedSnippetList(req.query, { containerId }));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-8 text-sm text-danger">Failed to load container snippets.</p>`);
    }
});

containerRouter.get("/:id/available-snippets", (req: Request<{ id: string }>, res: Response) => {
    try {
        const containerId = parseId(req.params.id);
        if (!containerId) {
            return res.status(400).type("html").send(`<p class="px-4 py-8 text-sm text-danger">Invalid container ID.</p>`);
        }

        const container = getContainerByIdentifier(containerId);
        if (!container) {
            return res.status(404).type("html").send(`<p class="px-4 py-8 text-sm text-ink-muted">Container not found.</p>`);
        }

        return res.type("html").send(renderPagedAvailableSnippetsList(containerId, req.query));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-8 text-sm text-danger">Failed to load available snippets.</p>`);
    }
});

containerRouter.post("/:id/snippets/add", (req: Request<{ id: string }>, res: Response) => {
    try {
        const containerId = parseId(req.params.id);
        if (!containerId) {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Invalid container ID.</p>`);
        }

        const ids = parseIds(req.body.ids);
        if (ids.length > 0) {
            addSnippetsToContainer(containerId, ids);
        }

        res.setHeader("HX-Trigger", "snippetsChanged");
        return res.type("html").send(renderPagedAvailableSnippetsList(containerId, req.body));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Failed to add snippets.</p>`);
    }
});

containerRouter.post("/:id/snippets/delete", (req: Request<{ id: string }>, res: Response) => {
    try {
        const containerId = parseId(req.params.id);
        if (!containerId) {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Invalid container ID.</p>`);
        }

        const ids = parseIds(req.body.ids);
        if (ids.length > 0) {
            removeSnippetsFromContainer(containerId, ids);
        }

        res.setHeader("HX-Trigger", "snippetsChanged");
        return res.type("html").send(renderPagedSnippetList(req.body, { containerId }));
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Failed to remove snippets.</p>`);
    }
});

containerRouter.post("/create", (req: Request, res: Response) => {
    try {
        const name = (req.body.name ?? "").trim();
        const description = (req.body.description ?? "").trim();

        if (!name) {
            res.type("html").send(renderContainerCreateResultHtml("Container name is required.", "error"));
            return;
        }

        const container = createContainer({ name, description });
        if (!container) {
            res.type("html").send(renderContainerCreateResultHtml("Failed to create container.", "error"));
            return;
        }

        res.type("html").send(renderContainerCreateResultHtml(`Container "${container.name}" created successfully.`, "ok"));
    } catch (error) {
        console.error(error);
        res.type("html").send(renderContainerCreateResultHtml(`Error: ${String(error)}`, "error"));
    }
});

containerRouter.delete("/:name", (req: Request<{ name: string }>, res: Response) => {
    try {
        const name = String(req.params.name ?? "").trim();
        const containers = getAllContainers();

        if (!name) {
            res.type("html").send(`
                <div class="mb-4">
                    ${renderContainerCreateResultHtml("Container name is required.", "error")}
                </div>
                ${renderContainersHtml(containers)}
            `);
            return;
        }

        const deleted = deleteContainer(name);
        if (deleted) {
            const updatedContainers = getAllContainers();
            res.type("html").send(renderContainersHtml(updatedContainers));
        } else {
            res.type("html").send(`
                <div class="mb-4">
                    ${renderContainerCreateResultHtml(`Container "${name}" not found.`, "error")}
                </div>
                ${renderContainersHtml(containers)}
            `);
        }
    } catch (error) {
        console.error(error);
        const containers = getAllContainers();
        res.type("html").send(`
            <div class="mb-4">
                ${renderContainerCreateResultHtml(`Error: ${String(error)}`, "error")}
            </div>
            ${renderContainersHtml(containers)}
        `);
    }
});

export default containerRouter;
