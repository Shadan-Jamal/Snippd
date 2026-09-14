import type { SnippetWithTags } from "../../src/types/index.ts";

export function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

const snippetsTableShell = `
<table class="w-full text-left text-sm">
    <thead class="border-b border-paper-line bg-paper/80 text-xs uppercase tracking-wide text-ink-faint">
    <tr>
        <th class="px-4 py-3 font-medium w-14">ID</th>
        <th class="px-4 py-3 font-medium">Title</th>
        <th class="px-4 py-3 font-medium w-24">Ext</th>
        <th class="px-4 py-3 font-medium">Tags</th>
        <th class="px-4 py-3 font-medium w-36 text-right">Updated</th>
    </tr>
    </thead>
    <tbody class="divide-y divide-paper-line">
    </tbody>
</table>
`;

export const renderSnippetHtml = (snippet: SnippetWithTags | null): string => {
    if (!snippet) {
        return `
          <p class="px-4 py-8 text-sm text-ink-muted">Snippet not found.</p>
          <form id="edit-mode" hx-swap-oob="true" class="hidden"></form>
          <dialog id="delete-dialog" hx-swap-oob="true" class="hidden"></dialog>
        `;
    }

    const tagsLabel = snippet.tags.length
        ? snippet.tags.map((tag) => escapeHtml(tag.name)).join(", ")
        : "—";
    const tagsInput = snippet.tags.map((tag) => tag.name).join(" ");
    const title = escapeHtml(snippet.title);
    const ext = escapeHtml(snippet.extension);
    const body = escapeHtml(snippet.snippet);
    const updated = escapeHtml(new Date(snippet.updated_at).toLocaleString());

    return `
      <header class="mb-5 flex flex-wrap items-start justify-between gap-4 px-4 pt-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-semibold tracking-tight">${title}</h1>
            <span class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">${ext}</span>
          </div>
          <p class="mt-1 text-xs text-ink-faint">
            ID <span class="font-mono">${snippet.id}</span>
            · updated <time>${updated}</time>
            · tags <span class="text-ink-muted">${tagsLabel}</span>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border border-paper-line bg-paper-card px-3 py-1.5 text-sm font-medium hover:opacity-90"
            onclick="navigator.clipboard.writeText(document.getElementById('snippet-code').innerText).then(() => this.textContent = 'Copied').finally(() => setTimeout(() => this.textContent = 'Copy', 1200))"
          >Copy</button>
          <button
            type="button"
            class="rounded-md border border-paper-line bg-paper-card px-3 py-1.5 text-sm font-medium hover:opacity-90"
            onclick="window.snippdSetMode('edit')"
          >Edit</button>
          <button
            type="button"
            class="rounded-md border border-danger/20 bg-danger-soft px-3 py-1.5 text-sm font-medium text-danger hover:opacity-90"
            onclick="document.getElementById('delete-dialog').showModal()"
          >Delete</button>
        </div>
      </header>

      <div class="border-t border-b border-paper-line px-4 py-2 text-xs text-ink-faint font-mono">view</div>
      <pre class="snippet-body"><code id="snippet-code">${body}</code></pre>

      <form id="edit-mode" hx-swap-oob="true" class="hidden space-y-4 mt-6" onsubmit="return false;">
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="text-xs font-medium text-ink-muted">Title</span>
            <input name="title" value="${title}" class="mt-1.5 w-full rounded-md border border-paper-line bg-paper-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </label>
          <label class="block">
            <span class="text-xs font-medium text-ink-muted">Extension</span>
            <input name="ext" value="${ext}" class="mt-1.5 w-full rounded-md border border-paper-line bg-paper-card px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </label>
        </div>
        <label class="block">
          <span class="text-xs font-medium text-ink-muted">Tags</span>
          <input name="tags" value="${escapeHtml(tagsInput)}" class="mt-1.5 w-full rounded-md border border-paper-line bg-paper-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-ink-muted">Snippet</span>
          <textarea name="snippet" rows="14" class="snippet-body mt-1.5 focus:outline-none focus:ring-2 focus:ring-accent/30">${body}</textarea>
        </label>
        <div class="flex gap-2">
          <button type="submit" class="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90">Save changes</button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm text-ink-muted hover:text-ink"
            onclick="window.snippdSetMode('view')"
          >Cancel</button>
        </div>
      </form>

      <dialog id="delete-dialog" hx-swap-oob="true" class="rounded-lg border border-paper-line bg-paper-card p-0 shadow-lg backdrop:bg-ink/40 max-w-sm w-[calc(100%-2rem)] text-ink">
        <div class="px-5 py-4">
          <h2 class="text-base font-semibold">Delete snippet?</h2>
          <p class="mt-2 text-sm text-ink-muted">This will permanently remove <span class="font-medium text-ink">${title}</span>. This cannot be undone.</p>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:text-ink" onclick="this.closest('dialog').close()">Cancel</button>
            <button type="button" class="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90">Delete</button>
          </div>
        </div>
      </dialog>
    `;
}

export const renderSnippetsHtml = (snippets: SnippetWithTags[]): string => {
    const rows = snippets.length === 0
        ? `<tr><td colspan="5" class="px-4 py-3 text-center text-xs text-ink-faint">No snippets found</td></tr>`
        : snippets.map((snippet) => `
        <tr class="hover:bg-paper/60 cursor-pointer" onclick="location.href='snippet.html?id=${snippet.id}'">
            <td class="px-4 py-3 font-mono text-xs text-ink-faint">${snippet.id}</td>
            <td class="px-4 py-3 font-medium">${escapeHtml(snippet.title)}</td>
            <td class="px-4 py-3"><span class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">${escapeHtml(snippet.extension)}</span></td>
            <td class="px-4 py-3 ${snippet.tags.length > 0 ? "text-ink-muted" : "text-ink-faint"}">${snippet.tags.length > 0 ? snippet.tags.map((tag) => escapeHtml(tag.name)).join(", ") : "No tags"}</td>
            <td class="px-4 py-3 text-right text-xs text-ink-faint">${new Date(snippet.updated_at).toLocaleString()}</td>
        </tr>
    `).join("");

    const table = snippetsTableShell.replace("</tbody>", `${rows}</tbody>`);

    const count = `
      <p id="snippets-count" hx-swap-oob="true" class="mt-4 text-xs text-ink-faint">
        Showing <span class="font-mono">${snippets.length}</span> snippets
      </p>
    `;

    return table + count;
}

export const renderSearchResultsHtml = (query: string, results: SnippetWithTags[]): string => {
  let searchHeader = `<div class="border-b border-paper-line px-4 py-2.5 text-xs text-ink-faint">
    Results for <span class="font-mono text-ink">${query}</span> · <span class="font-mono">${results.length}</span> matches
  </div>`;
  if (results.length === 0) {
    return `<div class="border-b border-paper-line px-4 py-2.5 text-xs text-ink-faint">
      No matches found for <span class="font-mono text-ink">${query}</span>
    </div>`;
    };
  let searchResults = `
      <ul
        class="divide-y divide-paper-line">
        ${results.map((item) => {
          return `<li
          key="${item.id}"
          >
          <a href="snippet.html?id=${item.id}" class="flex items-start justify-between gap-4 px-4 py-3.5 hover:bg-paper/60">
              <div>
                <div class="font-medium">${escapeHtml(item.title)}</div>
                <p class="mt-1 font-mono text-xs text-ink-muted line-clamp-2">${escapeHtml(item.snippet)}</p>
              </div>
              <span class="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">${escapeHtml(item.extension)}</span>
            </a>
          </li>`;
        }).join("")}
        </ul>`;
  return searchHeader + searchResults;
};

export type ConfigStatusTemplateInput = {
    configFile: string;
    command: string;
    key: string | null;
    role: string;
    exists: boolean;
};

export function renderConfigStatusHtml(input: ConfigStatusTemplateInput): string {
    const { configFile, command, key, role, exists } = input;

    const badge = exists
        ? `<span class="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">found</span>`
        : `<span class="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-medium text-warn">missing</span>`;

    return `
      <div class="flex gap-3">
        <dt class="w-32 shrink-0 text-ink-muted">Config file</dt>
        <dd class="font-mono text-xs break-all">
          ${escapeHtml(configFile)}
          ${badge}
        </dd>
      </div>
      <div class="flex gap-3">
        <dt class="w-32 shrink-0 text-ink-muted">Effective editor</dt>
        <dd class="font-mono text-xs break-all">
          ${escapeHtml(command)}
          <span class="text-ink-faint">(${escapeHtml(key ?? "fallback")} · ${escapeHtml(role)})</span>
        </dd>
      </div>
      <div class="flex gap-3">
        <dt class="w-32 shrink-0 text-ink-muted">Overall</dt>
        <dd class="${exists ? "text-accent" : "text-warn"} font-medium text-sm">
          ${exists ? "JSON configuration loaded" : "Config file not found — using fallback editor"}
        </dd>
      </div>
    `;
}
