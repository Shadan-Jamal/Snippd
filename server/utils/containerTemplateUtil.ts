import { Container, SnippetWithTags } from "../../src/types/index.ts";
import { escapeHtml, formatRelativeTime } from "./snippetTemplateUtil.ts";

export function renderContainersHtml(containers: Container[]): string {
  if (containers.length === 0) {
    return `<p class="text-sm text-ink-faint">No containers yet. Create one to get started.</p>`;
  }

  const rows = containers.map((c) => {
    const name = escapeHtml(c.name);
    const desc = c.description ? escapeHtml(c.description) : `<span class="text-ink-faint">—</span>`;
    const created = formatRelativeTime(c.created_at);
    return `
          <li class="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper/60 cursor-pointer transition-colors" onclick="location.href='container.html?id=${c.id}'">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium hover:underline">${name}</span>
              </div>
              <p class="mt-0.5 text-xs text-ink-muted truncate">${desc}</p>
            </div>
            <div class="flex items-center gap-3 shrink-0" onclick="event.stopPropagation()">
              <time class="text-xs text-ink-faint">${created}</time>
              <button
                type="button"
                class="rounded-md border border-danger/20 bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger hover:opacity-90"
                hx-delete="/api/containers/${encodeURIComponent(c.name)}"
                hx-target="#container-list"
                hx-swap="innerHTML"
                hx-confirm="Delete container '${name}'? This cannot be undone."
              >Delete</button>
            </div>
          </li>
        `;
  }).join("");

  return `
      <p class="text-xs text-ink-faint mb-3"><span class="font-mono">${containers.length}</span> container${containers.length === 1 ? "" : "s"}</p>
      <div class="overflow-hidden rounded-lg border border-paper-line bg-paper-card">
        <ul class="divide-y divide-paper-line text-sm">
          ${rows}
        </ul>
      </div>
    `;
}

export function renderContainerCreateFormHtml(): string {
  return `
      <form
        class="mt-4 space-y-4"
        hx-post="/api/containers/create"
        hx-target="#create-result"
        hx-trigger="submit"
        hx-swap="innerHTML"
        hx-on::after-request="if(event.detail.successful) { htmx.ajax('GET', '/api/containers', { target: '#container-list', swap: 'innerHTML' }); this.reset(); }"
      >
        <label class="block">
          <span class="text-xs font-medium text-ink-muted">Container Name</span>
          <input
            name="name"
            type="text"
            required
            class="mt-1.5 block w-full text-sm border border-paper-line rounded-md bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-ink-faint"
            placeholder="e.g., project-backend"
          />
        </label>
        <label class="block">
          <span class="text-xs font-medium text-ink-muted">Description (Optional)</span>
          <input
            name="description"
            type="text"
            class="mt-1.5 block w-full text-sm border border-paper-line rounded-md bg-paper px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-ink-faint"
            placeholder="A brief description of the container"
          />
        </label>
        <div class="flex gap-2">
          <button type="submit" class="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90">
            Create Container
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm text-ink-muted hover:text-ink"
            onclick="this.closest('#create-form-slot').innerHTML = ''; document.getElementById('create-btn').classList.remove('hidden');"
          >Cancel</button>
        </div>
      </form>
      <div id="create-result" class="mt-4"></div>
    `;
}

export function renderContainerCreateResultHtml(
  message: string,
  kind: "ok" | "error" = "ok",
): string {
  const tone =
    kind === "error"
      ? "border-danger/30 bg-danger-soft text-danger"
      : "border-accent/30 bg-accent-soft text-accent";

  return `
      <div class="rounded-md border ${tone} px-3 py-2 text-sm">
        ${escapeHtml(message)}
      </div>
    `;
}

export function renderContainerHeaderHtml(container: Container, snippetCount: number): string {
  const desc = container.description
    ? escapeHtml(container.description)
    : '<span class="text-ink-faint">No description</span>';

  return `
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-semibold tracking-tight">${escapeHtml(container.name)}</h1>
        </div>
        <p class="text-sm text-ink-muted mt-1">
          ${desc}
          · <span class="font-mono text-xs text-ink-faint">${snippetCount} snippet${snippetCount === 1 ? "" : "s"}</span>
        </p>
      </div>
    `;
}

export type AvailableSnippetsListPage = {
  snippets: SnippetWithTags[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  containerId: number;
};

export const renderAvailableSnippetsHtml = (input: AvailableSnippetsListPage): string => {
  const { snippets, total, page, perPage, totalPages, containerId } = input;
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  const rows = snippets.length === 0
    ? `<tr><td colspan="6" class="px-4 py-8 text-center text-xs text-ink-faint">No snippets available to add.</td></tr>`
    : snippets.map((snippet) => `
        <tr class="hover:bg-paper/60 transition-colors">
            <td class="px-3 py-3 w-10">
              <input type="checkbox" name="ids" value="${snippet.id}" class="available-cb align-middle accent-accent cursor-pointer" />
            </td>
            <td class="px-4 py-3 font-mono text-xs text-ink-faint w-14">${snippet.id}</td>
            <td class="px-4 py-3 font-medium text-ink">
              <div class="truncate max-w-xs" title="${escapeHtml(snippet.title)}">${escapeHtml(snippet.title)}</div>
            </td>
            <td class="px-4 py-3 w-20"><span class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent">${escapeHtml(snippet.extension)}</span></td>
            <td class="px-4 py-3 text-xs ${snippet.tags.length > 0 ? "text-ink-muted" : "text-ink-faint"}">
              <div class="truncate max-w-[200px]" title="${snippet.tags.map((t) => escapeHtml(t.name)).join(", ")}">
                ${snippet.tags.length > 0 ? snippet.tags.map((tag) => escapeHtml(tag.name)).join(", ") : "No tags"}
              </div>
            </td>
            <td class="px-4 py-3 text-right w-24">
              <button
                type="button"
                class="rounded-md border border-paper-line bg-paper-card px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink hover:text-paper transition-colors"
                hx-post="/api/containers/${containerId}/snippets/add"
                hx-target="#available-snippets-table"
                hx-swap="innerHTML"
                hx-include="#available-filters, #available-list-limit, #available-list-page"
                hx-vals='{"ids": ["${snippet.id}"]}'
              >+ Add</button>
            </td>
        </tr>
    `).join("");

  const tableHeader = `
<table class="w-full text-left text-sm">
    <thead class="border-b border-paper-line bg-paper/80 text-xs uppercase tracking-wide text-ink-faint sticky top-0 backdrop-blur-xs">
    <tr>
        <th class="px-3 py-3 w-10">
          <input type="checkbox" id="available-select-all" class="align-middle accent-accent cursor-pointer" title="Select all" />
        </th>
        <th class="px-4 py-3 font-medium w-14">ID</th>
        <th class="px-4 py-3 font-medium">Title</th>
        <th class="px-4 py-3 font-medium w-20">Ext</th>
        <th class="px-4 py-3 font-medium">Tags</th>
        <th class="px-4 py-3 font-medium w-24 text-right">Action</th>
    </tr>
    </thead>
    <tbody class="divide-y divide-paper-line">
      ${rows}
    </tbody>
</table>
`;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const btnClass = "rounded-md border border-paper-line bg-paper-card px-2.5 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-40";
  const include = "#available-filters, #available-list-limit";

  const pager = `
      <div id="available-snippets-pager" hx-swap-oob="true" data-page="${page}" class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p id="available-snippets-count" class="text-xs text-ink-faint">
          Showing <span class="font-mono">${from}-${to}</span> of <span class="font-mono">${total}</span> available snippets
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="${btnClass}"
            ${prevDisabled ? "disabled" : ""}
            hx-get="/api/containers/${containerId}/available-snippets"
            hx-target="#available-snippets-table"
            hx-swap="innerHTML"
            hx-include="${include}"
            hx-vals='{"page": "${Math.max(1, page - 1)}"}'
          >Prev</button>
          <span class="text-xs text-ink-muted">Page <span class="font-mono">${page}</span> / <span class="font-mono">${totalPages}</span></span>
          <button
            type="button"
            class="${btnClass}"
            ${nextDisabled ? "disabled" : ""}
            hx-get="/api/containers/${containerId}/available-snippets"
            hx-target="#available-snippets-table"
            hx-swap="innerHTML"
            hx-include="${include}"
            hx-vals='{"page": "${Math.min(totalPages, page + 1)}"}'
          >Next</button>
        </div>
      </div>
    `;

  return tableHeader + pager;
};