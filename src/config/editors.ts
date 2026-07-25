import which from "which";

export interface EditorDef {
    name: string;
    command: string;
    args: string[];
    readOnlyArgs: string[];
    platforms: NodeJS.Platform[];
}

export const knownEditors: EditorDef[] = [
    {
        name: "VS Code",
        command: "code",
        args: ["--wait"],
        readOnlyArgs: ["--wait"],
        platforms: ["win32", "darwin", "linux"],
    },
    {
        name: "Cursor",
        command: "cursor",
        args: ["--wait"],
        readOnlyArgs: ["--wait"],
        platforms: ["win32", "darwin", "linux"],
    },
    {
        name: "Antigravity",
        command: "antigravity",
        args: ["--wait"],
        readOnlyArgs: ["--wait"],
        platforms: ["win32", "darwin", "linux"],
    },
    {
        name: "Vim",
        command: "vim",
        args: [],
        readOnlyArgs: ["-R"],
        platforms: ["darwin", "linux"],
    },
    {
        name: "Neovim",
        command: "nvim",
        args: [],
        readOnlyArgs: ["-R"],
        platforms: ["win32", "darwin", "linux"],
    },
    {
        name: "Nano",
        command: "nano",
        args: [],
        readOnlyArgs: ["-v"],
        platforms: ["darwin", "linux"],
    },
    {
        name: "Sublime Text",
        command: "subl",
        args: ["--wait"],
        readOnlyArgs: ["--wait"],
        platforms: ["win32", "darwin", "linux"],
    },
    {
        name: "Notepad (Windows)",
        command: "notepad",
        args: [],
        readOnlyArgs: [],
        platforms: ["win32"],
    },
];

/**
 * Uses `which` to resolve the full path of an editor's executable.
 * Returns the resolved path (e.g. C:\...\code.cmd) or null if not found.
 * This avoids needing shell:true when launching the editor later.
 */
export function resolveEditorPath(editor: EditorDef): string | null {
    try {
        return which.sync(editor.command);
    } catch {
        return null;
    }
}
