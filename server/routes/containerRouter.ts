import { Router, type Request, type Response } from "express";
import {
    getAllContainers,
    createContainer,
    deleteContainer,
} from "../../db/queries/containers.ts";
import { renderContainersHtml, renderContainerCreateResultHtml, renderContainerCreateFormHtml } from "../utils/templates.ts";

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
