import { getFilteredContainerSnippets, getFilteredAvailableSnippets } from "../../db/queries/containers.ts";
import { getAllSnippets, getFilteredSnippets } from "../../db/queries/snippets.ts";
import { readConfigFile } from "../../src/config/snippdConfig.ts";
import { renderAvailableSnippetsHtml } from "./containerTemplateUtil.ts";
import { renderSnippetsHtml } from "./snippetTemplateUtil.ts";


const PAGE_SIZES = [10, 25, 50, 100] as const;

export function parseId(value: unknown): number | null {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseIds(raw: unknown): number[] {
    const values = Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw];
    return [...new Set(
        values
            .map((value) => Number.parseInt(String(value), 10))
            .filter((id) => Number.isFinite(id) && id > 0),
    )];
}

export function parseList(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map((value) => String(value).trim()).filter(Boolean);
    }
    return raw ? String(raw).split(",").map((value) => value.trim()).filter(Boolean) : [];
}

export function parsePageSize(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? 25), 10);
    return (PAGE_SIZES as readonly number[]).includes(parsed) ? parsed : 25;
}

export function parsePage(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? 1), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseLimit(value: unknown, fallback = 30): number {
    const parsed = Number.parseInt(String(value ?? fallback), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(200, Math.max(1, parsed));
}

export type PagedSnippetListSource = {
    ext?: unknown;
    tags?: unknown;
    page?: unknown;
    limit?: unknown;
};

export function renderPagedSnippetList(
    source: PagedSnippetListSource,
    options?: { containerId?: number },
): string {
    const ext = parseList(source.ext);
    const tags = parseList(source.tags);
    const perPage = parsePageSize(source.limit);
    const requestedPage = parsePage(source.page);
    const all = options?.containerId !== undefined
        ? getFilteredContainerSnippets(options.containerId, { ext, tags })
        : (ext.length || tags.length
            ? getFilteredSnippets({ ext, tags })
            : getAllSnippets());
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
        endpoint: options?.containerId !== undefined
            ? `/api/containers/${options.containerId}/snippets`
            : "/api/snippets",
    });
}

export type AvailableSnippetsSource = {
    ext?: unknown;
    tags?: unknown;
    q?: unknown;
    page?: unknown;
    limit?: unknown;
};

export function renderPagedAvailableSnippetsList(
    containerId: number,
    source: AvailableSnippetsSource,
): string {
    const ext = parseList(source.ext);
    const tags = parseList(source.tags);
    const q = source.q ? String(source.q).trim() : undefined;
    const perPage = parsePageSize(source.limit);
    const requestedPage = parsePage(source.page);
    const all = getFilteredAvailableSnippets(containerId, { ext, tags, q });
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * perPage;

    return renderAvailableSnippetsHtml({
        snippets: all.slice(start, start + perPage),
        total,
        page,
        perPage,
        totalPages,
        containerId,
    });
}

export function editorRole(key: string | null): string {
    if (key === "SNIPPD_VISUAL") return "GUI";
    if (key === "SNIPPD_EDITOR") return "TUI";
    return "fallback";
}

export function doctorCautions(): string[] {
    const cautions: string[] = [];
    const { SNIPPD_VISUAL, SNIPPD_EDITOR } = readConfigFile();
    const visual = SNIPPD_VISUAL?.trim() ?? "";
    const editor = SNIPPD_EDITOR?.trim() ?? "";

    if (visual && !editor) {
        cautions.push("SNIPPD_EDITOR is empty — only SNIPPD_VISUAL is used.");
    } else if (editor && !visual) {
        cautions.push("SNIPPD_VISUAL is empty — only SNIPPD_EDITOR is used.");
    }

    return cautions;
}