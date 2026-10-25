// ─── Command Types ───────────────────────────────────────
export type Commands = 
    "save" | 
    "view" | 
    "search" | 
    "ai" | 
    "list" |
    "recent" | 
    "edit" | 
    "copy" | 
    "delete" | 
    "tags" | 
    "containers" | 
    "config" | 
    "doctor" | 
    "exts" | 
    "import" | 
    "export" | 
    "ui" | 
    "exit";

// ─── Snippet Types ───────────────────────────────────────────

export interface Snippet {
    id: number;
    title: string;
    code: string;
    extension: string;
    created_at: string;
    updated_at: string;
}

export interface SnippetWithTags extends Snippet {
    tags: Tag[];
}

export interface CreateSnippetInput {
    title: string;
    code: string;
    extension: string;
    tags?: string[];
}

export interface UpdateSnippetInput {
    title?: string;
    code?: string;
    extension?: string;
}

// ─── Tag Types ───────────────────────────────────────────────

export interface Tag {
    id: number;
    name: string;
}

export interface TagWithCount extends Tag {
    snippet_count: number;
}

export interface ExportData {
    version: number;
    exported_at: string;
    snippets: SnippetWithTags[];
}


// ─── Container Types ───────────────────────────────────────────────

export interface Container {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface CreateContainerInput {
    name: string;
    description: string;
}

export type ContainerAction = "show" | "create" | "add" | "remove" | "del" | "rename" | "update" | "back";

// ─── Config Types ───────────────────────────────────────────────


export type EditorConfigKey = "SNIPPD_GUI" | "SNIPPD_TUI";
export type ConfigKey = EditorConfigKey | "CURRENT_EDITOR" | "OLLAMA_API_URL" | "OLLAMA_MODEL";

export type SavedEditors = Record<string, string>;

export interface SnippdConfig {
    SNIPPD_GUI?: string;
    SNIPPD_TUI?: string;
    CURRENT_EDITOR?: EditorConfigKey | "";
    OLLAMA_API_URL?: string;
    OLLAMA_MODEL?: string;
    EDITORS?: SavedEditors;
}

export interface ConfigCheckResult {
    errors: string[];
    warnings: string[];
}

export interface EmbeddingMeta {
    model: string;
    dim: number;
    updated_at: string;
}

export interface SnippetWithDistance extends SnippetWithTags {
    distance: number;
}