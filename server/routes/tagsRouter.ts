import { Router, type Request, type Response } from "express";
import {
    getTagsWithCounts,
    getTagByNameWithCount,
    renameTag,
    deleteTag,
    getTagByName,
} from "../../db/queries/tags.ts";
import { getSnippetIdsByTag } from "../../db/queries/tags.ts";
import { getSnippetsByIds } from "../../db/queries/snippets.ts";
import { renderTagsHtml, renderTagSnippetsHtml } from "../utils/tagsTemplateUtil.ts";
import { renderPagedSnippetList } from "../utils/misc.ts";

const tagsRouter = Router();

tagsRouter.get("/", (req: Request, res: Response) => {
    try {
        const name = req.query.name ? String(req.query.name).trim() : "";
        
        if (name) {
            // View snippets by tag
            const tag = getTagByNameWithCount(name);
            
            if (!tag) {
                return res.status(404).type("html").send(`<p class="px-4 py-8 text-sm text-ink-muted">Tag not found.</p>`);
            }

            const snippetIds = getSnippetIdsByTag(name);
            
            if (snippetIds.length === 0) {
                return res.type("html").send(renderTagSnippetsHtml(tag, []));
            }

            // Use paged list for tag snippets
            return res.type("html").send(renderPagedSnippetList(req.query, { snippetIds }));
        }
        
        // List all tags
        const tags = getTagsWithCounts();
        return res.type("html").send(renderTagsHtml(tags));
    } catch (error) {
        console.error(error);
        return res.type("html").send(`<p class="px-4 py-3 text-sm text-danger">Failed to load tags: ${String(error)}</p>`);
    }
});

tagsRouter.post("/rename", (req: Request, res: Response) => {
    try {
        const { id, newName } = req.body;
        
        if (!id || !newName) {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">ID and new name are required.</p>`);
        }

        const success = renameTag(Number(id), newName);
        
        if (success) {
            const updatedTags = getTagsWithCounts();
            return res.type("html").send(renderTagsHtml(updatedTags));
        } else {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Failed to rename tag.</p>`);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Error renaming tag.</p>`);
    }
});

tagsRouter.delete("/:id", (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        
        if (!id) {
            return res.status(400).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Invalid tag ID.</p>`);
        }

        const success = deleteTag(id);
        
        if (success) {
            const updatedTags = getTagsWithCounts();
            return res.type("html").send(renderTagsHtml(updatedTags));
        } else {
            return res.status(404).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Tag not found.</p>`);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).type("html").send(`<p class="px-4 py-3 text-sm text-danger">Error deleting tag.</p>`);
    }
});

export default tagsRouter;
