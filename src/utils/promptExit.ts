/** Inquirer Ctrl+C / Esc cancel — exit quietly (no stack dump). */
export function isUserCancel(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const name = (err as { name?: string }).name;
    return name === "ExitPromptError"
        || name === "AbortPromptError"
        || name === "CancelPromptError";
}

export function exitQuietly(code = 130): never {
    process.exit(code);
}

/** Use in catch blocks around interactive prompts. */
export function rethrowIfUserCancel(err: unknown): void {
    if (isUserCancel(err)) exitQuietly();
}
