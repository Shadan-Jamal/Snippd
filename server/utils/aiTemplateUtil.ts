import type { SnippetWithDistance } from "../../src/types/index.ts";

export function renderAiSearchResultsHtml(query: string, results: SnippetWithDistance[]): string {
    if (results.length === 0) {
        return `
            <div class="flex min-h-[140px] items-center justify-center p-6 text-center text-sm text-ink-faint">
                <p>No semantic matches for <span class="font-mono text-ink">"${query}"</span>.</p>
            </div>
        `;
    }

    const rows = results.map((result, i) => {
        const confidence = Math.round((1 - result.distance) * 100);
        return `
            <tr class="border-b border-paper-line hover:bg-paper-card/50 transition-colors">
                <td class="px-4 py-3">
                    <span class="text-xs text-ink-muted mr-2">[${i + 1}]</span>
                    <a href="snippet.html?id=${result.id}" class="font-mono text-sm text-ink hover:text-accent">${result.title}</a>
                </td>
                <td class="px-4 py-3 text-sm text-ink-muted">.${result.extension}</td>
                <td class="px-4 py-3 text-sm text-ink-muted">${confidence}% match</td>
            </tr>
        `;
    }).join("");

    return `
        <div class="border-b border-paper-line px-4 py-2.5 text-xs text-ink-faint">
            <span>Found ${results.length} semantic match${results.length !== 1 ? 'es' : ''} for "${query}"</span>
        </div>
        <div class="mb-4">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-paper-line">
                        <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Title</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Extension</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">Match</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

export function renderAiStatusHtml(status: { indexed: number; total: number; compat: { ok: boolean; reason?: string } }): string {
    const { indexed, total, compat } = status;
    
    return `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="rounded-lg border border-paper-line bg-paper-card p-4">
                    <p class="text-xs text-ink-muted uppercase tracking-wider mb-1">Indexed</p>
                    <p class="text-2xl font-semibold text-ink">${indexed}/${total}</p>
                </div>
                <div class="rounded-lg border border-paper-line bg-paper-card p-4">
                    <p class="text-xs text-ink-muted uppercase tracking-wider mb-1">Status</p>
                    <p class="text-2xl font-semibold ${compat.ok ? 'text-green-500' : 'text-danger'}">
                        ${compat.ok ? 'Ready' : 'Error'}
                    </p>
                </div>
            </div>
            
            ${!compat.ok ? `
                <div class="rounded-lg border border-danger/20 bg-danger-soft p-4">
                    <p class="text-sm text-danger">${compat.reason || 'Embedding index is not compatible with current configuration.'}</p>
                </div>
            ` : ''}
            
            ${indexed < total ? `
                <div class="rounded-lg border border-accent/20 bg-accent-soft p-4">
                    <p class="text-sm text-ink">${total - indexed} snippet${total - indexed !== 1 ? 's' : ''} not indexed. Run reindex to update embeddings.</p>
                </div>
            ` : ''}
        </div>
    `;
}
