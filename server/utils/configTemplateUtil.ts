import { ConfigKey, SnippdConfig } from "../../src/config/snippdConfig.ts";
import { escapeHtml } from "./snippetTemplateUtil.ts";

export type ConfigStatusTemplateInput = {
  configFile: string;
  command: string;
  key: ConfigKey | null;
  role: string;
  exists: boolean;
};

export type ConfigPanelInput = ConfigStatusTemplateInput & {
  values: SnippdConfig;
  message?: string;
  messageKind?: "ok" | "warn" | "error";
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

export function renderConfigPanelHtml(input: ConfigPanelInput): string {
  const { configFile, command, key, role, exists, values, message, messageKind } = input;
  const badge = exists
    ? `<span class="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">found</span>`
    : `<span class="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">missing</span>`;

  const json = escapeHtml(`{\n\tSNIPPD_VISUAL: ${values.SNIPPD_VISUAL ?? ""},\n\tSNIPPD_EDITOR: ${values.SNIPPD_EDITOR ?? ""}\n}`);

  const flashClass = messageKind === "error"
    ? "text-danger"
    : messageKind === "warn"
      ? "text-warn"
      : "text-accent";

  const flash = message
    ? `<p class="mt-3 text-xs ${flashClass}">${escapeHtml(message)}</p>`
    : "";

  return `
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-sm font-semibold">Current configuration</h2>
          <p class="mt-1 text-xs text-ink-faint font-mono">config show · config path</p>
        </div>
        ${badge}
      </div>
      <dl class="mt-4 space-y-2 text-sm">
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-ink-muted">Config file</dt>
          <dd class="font-mono text-xs break-all">${escapeHtml(configFile)}</dd>
        </div>
        <div class="flex gap-3">
          <dt class="w-28 shrink-0 text-ink-muted">Effective</dt>
          <dd class="font-mono text-xs break-all">${escapeHtml(command)} <span class="text-ink-faint">(${escapeHtml(key ?? "fallback")} · ${escapeHtml(role)})</span></dd>
        </div>
      </dl>
      <pre class="mt-4 overflow-x-auto rounded-md bg-paper px-3 py-3 font-mono text-xs leading-relaxed text-ink-muted">${json}</pre>
      ${flash}
    `;
}