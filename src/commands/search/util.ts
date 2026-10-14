import { program } from "commander";
import chalk from "chalk";
import { input, checkbox } from "@inquirer/prompts";
import type { SnippetWithTags } from "../../types/index.ts";
import db from "../../../db/connection.ts";
import { getTagsForSnippet } from "../../../db/queries/tags.ts";
import { searchByFields } from "../../../db/queries/snippets.ts";

export interface SearchOptions {
    title?: boolean;
    content?: boolean;
    ext?: boolean;
    container?: boolean;
    tags?: boolean;
}

export function buildFTS5Query(query: string, fields: string[]): string {
    const normalized = query.trim().split(/\s+/).filter(Boolean);
    if (normalized.length === 0) return "";

    const terms = normalized.map((term) => (term.endsWith("*") ? term : `${term}*`));
    const fieldQueries = fields.map((field) =>
        terms.map((term) => `${field}:${term}`).join(" OR "),
    );

    return fieldQueries.join(" OR ");
}

export function searchSnippetsByFields(query: string, options: SearchOptions = {}): SnippetWithTags[] {
    const selected: string[] = [];
    const hasExplicitSelection = Boolean(options.title || options.content || options.ext || options.container || options.tags);

    if (hasExplicitSelection) {
        if (options.title) selected.push("title");
        if (options.content) selected.push("code");
        if (options.ext) selected.push("extension");
    } else {
        selected.push("title", "code");
    }

    const results = new Map<number, SnippetWithTags>();

    if (selected.length > 0) {
        const builtQuery = buildFTS5Query(query, selected);
        if (builtQuery) {
            const rows = db.prepare(`
                SELECT snippets.* FROM snippets
                JOIN snippets_fts ON snippets.id = snippets_fts.rowid
                WHERE snippets_fts MATCH @query
                ORDER BY rank
            `).all({ query: builtQuery }) as { id: number; title: string; code: string; extension: string; created_at: string; updated_at: string }[];

            for (const row of rows) {
                results.set(row.id, {
                    ...row,
                    tags: getTagsForSnippet(row.id),
                });
            }
        }
    }

    if (options.tags) {
        const terms = query.trim().split(/\s+/).filter(Boolean);
        if (terms.length > 0) {
            const clauses = terms.map(() => "LOWER(t.name) LIKE LOWER(?)").join(" OR ");
            const params = terms.map((term) => `%${term}%`);

            const rows = db.prepare(`
                SELECT DISTINCT s.*
                FROM snippets s
                JOIN snippet_tags st ON st.snippet_id = s.id
                JOIN tags t ON t.id = st.tag_id
                WHERE ${clauses}
                ORDER BY s.updated_at DESC
            `).all(...params) as { id: number; title: string; code: string; extension: string; created_at: string; updated_at: string }[];

            for (const row of rows) {
                results.set(row.id, {
                    ...row,
                    tags: getTagsForSnippet(row.id),
                });
            }
        }
    }

    return Array.from(results.values()).sort((a, b) =>
        a.updated_at.localeCompare(b.updated_at) === 0
            ? a.id - b.id
            : b.updated_at.localeCompare(a.updated_at),
    );
}

export function searchSnippetsByField(query: string, field: "title" | "code" | "extension") {
    return searchByFields(query, [field]);
}

// ─── Interactive Flow ─────────────────────────────────────────────────────────

export const searchInteractiveFlow = async (parseAsyncArgs: string[]): Promise<void> => {
    console.log(chalk.cyan("\nSearch Snippets\n"));

    const query = await input({
        message: "Search query:",
        validate: (v) => v.trim().length > 0 || "Query cannot be empty.",
    });

    const filters = await checkbox({
        message: "Narrow search to (leave empty for all fields):",
        choices: [
            { name: "Title", value: "--title" },
            { name: "Content", value: "--content" },
            { name: "Extension", value: "--ext" },
            { name: "Tags", value: "--tags" },
            { name: "Containers", value: "--container" },
        ],
    });

    await program.parseAsync([...parseAsyncArgs, "search", query.trim(), ...filters]);
};
