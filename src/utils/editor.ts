import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getEditorConfig } from "../config/index.ts";

/**
 - Opens a temp file in the user's configured editor for writing input.
 - Waits for the editor to close, then returns the file contents.
 */

export function openEditorForInput(options?: {
    initialContent?: string;
    extension?: string;
}): string {
    const config = getEditorConfig();
    const ext = options?.extension ? `.${options.extension.replace(/^\./, "")}` : ".txt";
    const tmpFile = path.join(os.tmpdir(), `snippd-${Date.now()}${ext}`);

    // Write initial content if provided
    fs.writeFileSync(tmpFile, options?.initialContent || "", "utf-8");

    try {
        // Use resolvedCommand (full path from which) so no shell is needed
        execFileSync(config.resolvedCommand, [
            ...(config.args || []),
            tmpFile,
        ], {
            stdio: "inherit",
        });

        return fs.readFileSync(tmpFile, "utf-8");
    } finally {
        // Clean up the temp file
        try {
            fs.unlinkSync(tmpFile);
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 - Opens a snippet in the user's configured editor in read-only mode (if supported).
 - Falls back to regular open if readOnlyArgs aren't configured.
*/

export function openEditorForView(content: string, extension?: string): void {
    const config = getEditorConfig();
    const ext = extension ? `.${extension.replace(/^\./, "")}` : ".txt";
    const tmpFile = path.join(os.tmpdir(), `snippd-view-${Date.now()}${ext}`);

    fs.writeFileSync(tmpFile, content, "utf-8");

    try {
        const args = config.readOnlyArgs?.length
            ? [...config.readOnlyArgs, tmpFile]
            : [...(config.args || []), tmpFile];

        // Use resolvedCommand (full path from which) so no shell is needed
        execFileSync(config.resolvedCommand, args, {
            stdio: "inherit",
        });
    } finally {
        try {
            fs.unlinkSync(tmpFile);
        } catch {
            // Ignore cleanup errors
        }
    }
}
