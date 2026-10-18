import { ConfigStatusTemplateInput, renderConfigStatusHtml } from "./configTemplateUtil.ts";
import { escapeHtml } from "./snippetTemplateUtil.ts";

export type OllamaStatus = {
    api: string;
    model: string | null;
    reachable: boolean;
    modelAvailable: boolean;
    indexModel: string | null;
    indexDim: number | null;
    indexed: number;
    total: number;
};

export type DoctorReportInput = ConfigStatusTemplateInput & {
  errors: string[];
  warnings: string[];
  cautions: string[];
  ollama: OllamaStatus;
};

function renderFindingList(items: string[], kind: "error" | "warn" | "caution"): string {
  const styles = {
    error: {
      section: "border-danger/20 bg-danger-soft/40",
      title: "text-danger",
      mark: "text-danger",
      heading: "Errors",
      icon: "✗",
    },
    warn: {
      section: "border-warn/20 bg-warn-soft/40",
      title: "text-warn",
      mark: "text-warn",
      heading: "Warnings",
      icon: "⚠",
    },
    caution: {
      section: "border-paper-line bg-paper-card",
      title: "text-ink-muted",
      mark: "text-ink-faint",
      heading: "Cautions",
      icon: "ℹ",
    },
  }[kind];

  const rows = items.map((item) => `
      <li class="flex gap-2">
        <span class="${styles.mark} shrink-0 font-mono">${styles.icon}</span>
        <span class="whitespace-pre-wrap">${escapeHtml(item.trim())}</span>
      </li>
    `).join("");

  return `
      <section class="rounded-lg border ${styles.section} p-5">
        <h2 class="text-sm font-semibold ${styles.title}">${styles.heading}</h2>
        <ul class="mt-3 space-y-2 text-sm text-ink">
          ${rows}
        </ul>
      </section>
    `;
}

export function renderDoctorReportHtml(input: DoctorReportInput): string {
  const { errors, warnings, cautions, ollama } = input;
  const statusRows = renderConfigStatusHtml(input);

  let verdictClass = "text-accent";
  let verdict = "✅ JSON configuration loaded.";
  if (errors.length > 0) {
    verdictClass = "text-danger";
    verdict = "✗ Configuration needs attention.";
  } else if (warnings.length > 0) {
    verdictClass = "text-warn";
    verdict = "⚠ Configuration loaded with warnings.";
  } else if (cautions.length > 0) {
    verdictClass = "text-ink-muted";
    verdict = "ℹ Configuration loaded with cautions.";
  }

  // Build Ollama status section
  const ollamaStatusClass = ollama.reachable ? "text-accent" : "text-danger";
  const ollamaStatusText = ollama.reachable ? "reachable" : "unreachable";
  const modelStatusClass = ollama.modelAvailable ? "text-accent" : "text-danger";
  const modelStatusText = ollama.modelAvailable ? "available" : "missing / not embedding-capable";
  const indexModelText = ollama.indexModel
    ? `${escapeHtml(ollama.indexModel)} (dim ${ollama.indexDim})`
    : "(none — run snippd ai reindex)";
  const indexedStatusClass = ollama.indexed === ollama.total ? "text-accent" : "text-warn";

  const ollamaSection = `
    <section class="rounded-lg border border-paper-line bg-paper-card p-5">
      <h2 class="text-sm font-semibold mb-3">AI / embeddings</h2>
      <dl class="space-y-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-ink-muted">OLLAMA_API_URL</dt>
          <dd class="font-mono">${escapeHtml(ollama.api)}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-ink-muted">OLLAMA_MODEL</dt>
          <dd class="font-mono">${ollama.model ? escapeHtml(ollama.model) : '<span class="text-warn">(not set)</span>'}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-ink-muted">Ollama</dt>
          <dd class="${ollamaStatusClass}">${ollamaStatusText}</dd>
        </div>
        ${ollama.reachable && ollama.model ? `
        <div class="flex justify-between">
          <dt class="text-ink-muted">Embed model</dt>
          <dd class="${modelStatusClass}">${modelStatusText}</dd>
        </div>
        ` : ''}
        <div class="flex justify-between">
          <dt class="text-ink-muted">Index model</dt>
          <dd class="font-mono">${indexModelText}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-ink-muted">Indexed</dt>
          <dd class="${indexedStatusClass}">${ollama.indexed}/${ollama.total} snippets</dd>
        </div>
      </dl>
    </section>
  `;

  return `
      <section class="rounded-lg border border-paper-line bg-paper-card p-5">
        <h2 class="text-sm font-semibold mb-3">Status</h2>
        <dl class="space-y-3 text-sm">
          ${statusRows}
        </dl>
        <p class="mt-4 text-sm font-medium ${verdictClass}">${escapeHtml(verdict)}</p>
      </section>
      ${ollamaSection}
      ${errors.length ? renderFindingList(errors, "error") : ""}
      ${warnings.length ? renderFindingList(warnings, "warn") : ""}
      ${cautions.length ? renderFindingList(cautions, "caution") : ""}
    `;
}
