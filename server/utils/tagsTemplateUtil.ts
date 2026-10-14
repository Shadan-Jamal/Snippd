import type { Tag } from "../../src/types/index.ts";

export function renderTagsHtml(tags: (Tag & { snippet_count: number })[]): string {
    if (tags.length === 0) {
        return `
            <div class="px-4 py-8 text-sm text-ink-faint">
                <p>No tags found. Create snippets with tags to see them here.</p>
            </div>
        `;
    }

    const rows = tags.map((tag) => `
        <tr class="border-b border-paper-line hover:bg-paper-card/50 transition-colors">
            <td class="px-4 py-3">
                <a href="tags.html?name=${encodeURIComponent(tag.name)}" class="font-mono text-sm text-ink hover:text-accent">${tag.name}</a>
            </td>
            <td class="px-4 py-3 text-sm text-ink-muted">${tag.snippet_count}</td>
            <td class="px-4 py-3 text-right">
                <button 
                    hx-post="/api/tags/rename" 
                    hx-vals='{"id": ${tag.id}}'
                    hx-target="#tag-modal" 
                    hx-swap="innerHTML"
                    class="text-xs text-ink-muted hover:text-ink mr-2">
                    Rename
                </button>
                <button 
                    hx-delete="/api/tags/${tag.id}" 
                    hx-target="#tags-table" 
                    hx-swap="innerHTML"
                    hx-confirm="Are you sure you want to delete this tag?"
                    class="text-xs text-danger hover:opacity-80">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

    return `
        <div id="tags-table">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-paper-line">
                        <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Tag</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Snippets</th>
                        <th class="px-4 py-2 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
        <div id="tag-modal" class="hidden"></div>
    `;
}

export function renderTagSnippetsHtml(tag: Tag & { snippet_count: number }, snippets: any[]): string {
    if (snippets.length === 0) {
        return `
            <div class="px-4 py-8 text-sm text-ink-faint">
                <p>No snippets found with tag "${tag.name}".</p>
                <a href="tags.html" class="text-accent hover:underline">Back to tags</a>
            </div>
        `;
    }

    const rows = snippets.map((snippet) => `
        <tr class="border-b border-paper-line hover:bg-paper-card/50 transition-colors">
            <td class="px-4 py-3">
                <a href="snippet.html?id=${snippet.id}" class="font-mono text-sm text-ink hover:text-accent">${snippet.title}</a>
            </td>
            <td class="px-4 py-3 text-sm text-ink-muted">.${snippet.extension}</td>
            <td class="px-4 py-3 text-sm text-ink-muted">${new Date(snippet.updated_at).toLocaleDateString()}</td>
        </tr>
    `).join("");

    return `
        <div class="mb-4">
            <a href="tags.html" class="text-sm text-ink-muted hover:text-ink">← Back to tags</a>
        </div>
        <div class="mb-6">
            <h2 class="text-lg font-semibold text-ink">${tag.name}</h2>
            <p class="text-sm text-ink-muted">${tag.snippet_count} snippet${tag.snippet_count !== 1 ? 's' : ''}</p>
        </div>
        <table class="w-full">
            <thead>
                <tr class="border-b border-paper-line">
                    <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Title</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Extension</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Updated</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}
