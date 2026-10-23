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
                    type="button"
                    onclick="const d = document.getElementById('tag-rename-dialog'); document.getElementById('rename-tag-id').value = '${tag.id}'; const inp = document.getElementById('rename-tag-input'); inp.value = '${tag.name.replace(/'/g, "\\'")}'; d.showModal(); inp.select();"
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
        <dialog id="tag-rename-dialog" class="rounded-xl border border-paper-line bg-paper-card p-6 shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-xs max-w-sm w-[calc(100%-2rem)] text-ink">
          <form method="dialog" class="space-y-4" onsubmit="event.preventDefault(); const form = event.target; const id = form.tagId.value; const newName = form.newName.value.trim(); if (newName) { htmx.ajax('POST', '/api/tags/rename', { values: { id, newName }, target: '#tags-table', swap: 'innerHTML' }); form.closest('dialog').close(); }">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold tracking-tight">Rename Tag</h3>
              <button type="button" onclick="this.closest('dialog').close()" class="text-ink-muted hover:text-ink text-sm">✕</button>
            </div>
            <input type="hidden" name="tagId" id="rename-tag-id" />
            <div>
              <label class="block text-xs font-medium text-ink-muted mb-1.5" for="rename-tag-input">New Tag Name</label>
              <input id="rename-tag-input" name="newName" type="text" required class="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono" />
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" onclick="this.closest('dialog').close()" class="rounded-md border border-paper-line bg-paper px-3 py-1.5 text-xs font-medium hover:opacity-90">Cancel</button>
              <button type="submit" class="rounded-md bg-ink text-paper px-3 py-1.5 text-xs font-medium hover:opacity-90">Save</button>
            </div>
          </form>
        </dialog>
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
