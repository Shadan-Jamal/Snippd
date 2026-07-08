// ─── Snippet Types ───────────────────────────────────────────

export interface Snippet {
    id: number;
    title: string;
    snippet: string;
    language: string;
    created_at: string;
    updated_at: string;
}

export interface SnippetWithTags extends Snippet {
    tags: Tag[];
}

export interface CreateSnippetInput {
    title: string;
    snippet: string;
    language: string;
    tags?: string[];
}
export interface UpdateSnippetInput {
    title?: string;
    snippet?: string;
    language?: string;
}

// ─── Tag Types ───────────────────────────────────────────────

export interface Tag {
    id: number;
    name: string;
}

export interface ExportData {
    version: number;
    exported_at: string;
    snippets: SnippetWithTags[];
}
