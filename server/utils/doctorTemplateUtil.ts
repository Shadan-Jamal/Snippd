import { ConfigStatusTemplateInput, renderConfigStatusHtml } from "./configTemplateUtil.ts";
import { escapeHtml } from "./snippetTemplateUtil.ts";

export type DoctorReportInput = ConfigStatusTemplateInput & {
  errors: string[];
  warnings: string[];
  cautions: string[];
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
  const { errors, warnings, cautions } = input;
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

  return `
      <section class="rounded-lg border border-paper-line bg-paper-card p-5">
        <h2 class="text-sm font-semibold mb-3">Status</h2>
        <dl class="space-y-3 text-sm">
          ${statusRows}
        </dl>
        <p class="mt-4 text-sm font-medium ${verdictClass}">${escapeHtml(verdict)}</p>
      </section>
      ${errors.length ? renderFindingList(errors, "error") : ""}
      ${warnings.length ? renderFindingList(warnings, "warn") : ""}
      ${cautions.length ? renderFindingList(cautions, "caution") : ""}
    `;
}
