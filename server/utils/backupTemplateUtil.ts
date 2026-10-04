import { escapeHtml } from "./snippetTemplateUtil.ts";

export function renderBackupMessageHtml(
  message: string,
  kind: "ok" | "warn" | "error" = "ok",
): string {
  const tone =
    kind === "error"
      ? "border-danger/30 bg-danger-soft text-danger"
      : kind === "warn"
        ? "border-warn/30 bg-warn-soft text-warn"
        : "border-accent/30 bg-accent-soft text-accent";

  return `
      <div class="rounded-md border ${tone} px-3 py-2 text-sm">
        ${escapeHtml(message)}
      </div>
    `;
}

export function renderImportResultHtml(result: {
  source: string;
  liveDb: string;
  inserted: number;
  updated: number;
  unchanged: number;
  tagsAdded: number;
  linksAdded: number;
}): string {
  return `
      <div class="rounded-md border border-accent/30 bg-accent-soft px-3 py-3 text-sm space-y-2">
        <p class="font-medium text-accent">Merged backup successfully</p>
        <dl class="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-ink">
          <dt class="text-ink-muted">Inserted</dt><dd class="font-mono text-xs">${result.inserted}</dd>
          <dt class="text-ink-muted">Updated</dt><dd class="font-mono text-xs">${result.updated} <span class="text-ink-faint">(newer incoming)</span></dd>
          <dt class="text-ink-muted">Unchanged</dt><dd class="font-mono text-xs">${result.unchanged} <span class="text-ink-faint">(local kept)</span></dd>
          <dt class="text-ink-muted">Tags +</dt><dd class="font-mono text-xs">${result.tagsAdded}</dd>
          <dt class="text-ink-muted">Links +</dt><dd class="font-mono text-xs">${result.linksAdded}</dd>
        </dl>
        <p class="text-xs text-ink-faint font-mono break-all">${escapeHtml(result.liveDb)}</p>
      </div>
    `;
}