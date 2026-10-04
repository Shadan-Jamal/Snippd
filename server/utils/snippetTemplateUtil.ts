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
        <th class="px-3 py-3 w-10">
          <input type="checkbox" data-select-all class="align-middle accent-accent" title="Select all" />
        </th>
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
            <button
              type="button"
              class="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90"
              hx-post="/api/snippets/${snippet.id}/delete"
            >Delete</button>
          </div>
        </div>
      </dialog>
    `;
}

export type SnippetListPage = {
  snippets: SnippetWithTags[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  endpoint?: string;
};

export const renderSnippetsHtml = (input: SnippetListPage | SnippetWithTags[]): string => {
  const paged: SnippetListPage = Array.isArray(input)
    ? {
      snippets: input,
      total: input.length,
      page: 1,
      perPage: Math.max(input.length, 1),
      totalPages: 1,
    }
    : input;

  const { snippets, total, page, perPage, totalPages } = paged;
  const endpoint = paged.endpoint || "/api/snippets";
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  const rows = snippets.length === 0
    ? `<tr><td colspan="6" class="px-4 py-8 text-center text-xs text-ink-faint">No snippets found</td></tr>`
    : snippets.map((snippet) => `
        <tr class="hover:bg-paper/60 cursor-pointer" onclick="location.href='/ui/snippet.html?id=${snippet.id}'">
            <td class="px-3 py-3" onclick="event.stopPropagation()">
              <input type="checkbox" name="ids" value="${snippet.id}" class="align-middle accent-accent" />
            </td>
            <td class="px-4 py-3 font-mono text-xs text-ink-faint">${snippet.id}</td>
            <td class="px-4 py-3 font-medium">${escapeHtml(snippet.title)}</td>
            <td class="px-4 py-3"><span class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">${escapeHtml(snippet.extension)}</span></td>
            <td class="px-4 py-3 ${snippet.tags.length > 0 ? "text-ink-muted" : "text-ink-faint"}">${snippet.tags.length > 0 ? snippet.tags.map((tag) => escapeHtml(tag.name)).join(", ") : "No tags"}</td>
            <td class="px-4 py-3 text-right text-xs text-ink-faint">${new Date(snippet.updated_at).toLocaleString()}</td>
        </tr>
    `).join("");

  const table = snippetsTableShell.replace("</tbody>", `${rows}</tbody>`);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const btnClass = "rounded-md border border-paper-line bg-paper-card px-2.5 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-40";
  const include = "#filters, #list-limit";

  const pager = `
      <div id="snippets-pager" hx-swap-oob="true" data-page="${page}" class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p id="snippets-count" class="text-xs text-ink-faint">
          Showing <span class="font-mono">${from}–${to}</span> of <span class="font-mono">${total}</span> snippets
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="${btnClass}"
            ${prevDisabled ? "disabled" : ""}
            hx-get="${endpoint}"
            hx-target="#snippets-table"
            hx-swap="innerHTML"
            hx-include="${include}"
            hx-vals='{"page": "${Math.max(1, page - 1)}"}'
          >Prev</button>
          <span class="text-xs text-ink-muted">Page <span class="font-mono">${page}</span> / <span class="font-mono">${totalPages}</span></span>
          <button
            type="button"
            class="${btnClass}"
            ${nextDisabled ? "disabled" : ""}
            hx-get="${endpoint}"
            hx-target="#snippets-table"
            hx-swap="innerHTML"
            hx-include="${include}"
            hx-vals='{"page": "${Math.min(totalPages, page + 1)}"}'
          >Next</button>
        </div>
      </div>
    `;

  return table + pager;
}

export const renderSearchResultsHtml = (query: string, results: SnippetWithTags[]): string => {
  const safeQuery = escapeHtml(query);
  if (results.length === 0) {
    return `<div class="border-b border-paper-line px-4 py-2.5 text-xs text-ink-faint">
      No matches found for <span class="font-mono text-ink">${safeQuery}</span>
    </div>`;
  }

  const searchHeader = `<div class="border-b border-paper-line px-4 py-2.5 text-xs text-ink-faint flex items-center justify-between gap-3">
    <span>Results for <span class="font-mono text-ink">${safeQuery}</span> · <span class="font-mono">${results.length}</span> matches</span>
    <label class="flex items-center gap-2 text-ink-muted">
      <input type="checkbox" data-select-all class="accent-accent" />
      Select all
    </label>
  </div>`;

  const searchResults = `
      <ul class="divide-y divide-paper-line">
        ${results.map((item) => {
    return `<li class="flex items-start gap-3 px-4 py-3.5 hover:bg-paper/60">
          <input type="checkbox" name="ids" value="${item.id}" class="mt-1 accent-accent" />
          <a href="snippet.html?id=${item.id}" class="flex min-w-0 flex-1 items-start justify-between gap-4">
              <div class="min-w-0">
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

export function formatRelativeTime(value: string): string {
  const then = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`).getTime();
  if (!Number.isFinite(then)) return escapeHtml(value);

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return new Date(then).toLocaleDateString();
}

function extensionLabel(ext: string): string {
  const trimmed = ext.trim();
  if (!trimmed) return "(none)";
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

export const renderRecentSnippetsHtml = (snippets: SnippetWithTags[]): string => {
  if (snippets.length === 0) {
    return `<li class="rounded-lg border border-paper-line bg-paper-card px-4 py-3 text-sm text-ink-faint">No recent snippets.</li>`;
  }

  return snippets.map((snippet, index) => `
        <li class="flex items-center gap-3">
          <input type="checkbox" name="ids" value="${snippet.id}" class="shrink-0 accent-accent" />
          <a href="snippet.html?id=${snippet.id}" class="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-lg border border-paper-line bg-paper-card px-4 py-3 hover:bg-paper/40">
            <div class="flex items-center gap-3 min-w-0">
              <span class="font-mono text-xs text-ink-faint w-6">${index + 1}</span>
              <span class="font-medium truncate">${escapeHtml(snippet.title)}</span>
              <span class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">${escapeHtml(snippet.extension)}</span>
            </div>
            <time class="shrink-0 text-xs text-ink-faint">${formatRelativeTime(snippet.updated_at)}</time>
          </a>
        </li>
    `).join("");
};

export const renderExtensionCountsHtml = (
  counts: { extension: string; count: number }[],
  query?: string,
): string => {
  if (counts.length === 0) {
    if (query) {
      return `<p class="col-span-full text-sm text-ink-faint">No extensions matching <span class="font-mono text-ink">${escapeHtml(query)}</span>.</p>`;
    }
    return `<p class="col-span-full text-sm text-ink-faint">No extensions yet.</p>`;
  }

  return counts.map(({ extension, count }) => {
    const href = `/api/snippets/extensions/${encodeURIComponent(extension)}`;
    return `
        <button
          type="button"
          class="rounded-lg border border-paper-line bg-paper-card px-4 py-3 text-left hover:ring-2 hover:ring-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/30"
          hx-get="${href}"
          hx-target="#ext-snippets"
          hx-swap="innerHTML"
        >
          <div class="font-mono text-sm font-medium text-accent">${escapeHtml(extensionLabel(extension))}</div>
          <div class="mt-1 text-xs text-ink-faint"><span class="font-mono">${count}</span> snippet${count === 1 ? "" : "s"}</div>
        </button>
        `;
  }).join("");
};

export const renderExtensionSnippetsHtml = (extension: string, snippets: SnippetWithTags[]): string => {
  const label = escapeHtml(extensionLabel(extension));
  const filterHref = `index.html?ext=${encodeURIComponent(extension)}`;

  const items = snippets.length === 0
    ? `<li class="px-4 py-3 text-sm text-ink-faint">No snippets for ${label}.</li>`
    : snippets.map((snippet) => {
      const tags = snippet.tags.length
        ? snippet.tags.map((tag) => escapeHtml(tag.name)).join(", ")
        : "No tags";
      return `
            <li>
              <a href="snippet.html?id=${snippet.id}" class="flex items-center justify-between px-4 py-3 hover:bg-paper/60">
                <span class="font-medium">${escapeHtml(snippet.title)}</span>
                <span class="text-xs text-ink-faint">${tags}</span>
              </a>
            </li>`;
    }).join("");

  return `
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-medium">Snippets · <span class="font-mono text-accent">${label}</span></h2>
        <a href="${filterHref}" class="text-xs text-ink-muted hover:text-ink">Open in All snippets</a>
      </div>
      <div class="overflow-hidden rounded-lg border border-paper-line bg-paper-card">
        <ul class="divide-y divide-paper-line text-sm">
          ${items}
        </ul>
      </div>
    `;
};
