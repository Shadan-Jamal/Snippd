import chalk from "chalk";

/**
 * Tiny terminal loader used while a command is waiting on work (DB queries,
 * file IO, Ollama requests, ...). It is intentionally prompt-agnostic: stop the
 * loader before showing an @inquirer/prompts prompt.
 *
 * - Work that finishes before `delay` never paints anything (no flicker).
 * - Non-TTY output (pipes, CI) runs the task with no spinner.
 * - Nested loaders share one renderer, so only one line is ever animated.
 */

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;
const DEFAULT_DELAY_MS = 50;

export interface LoaderOptions {
    /** Milliseconds to wait before showing the spinner. Defaults to 120. */
    delay?: number;
    /** Render even when stdout is not a TTY. */
    force?: boolean;
}

export interface Loader {
    /** Replace the text next to the spinner. */
    update(label: string): void;
    /** Clear the spinner without printing anything. */
    stop(): void;
    /** Clear the spinner and print a success line. */
    succeed(message?: string): void;
    /** Clear the spinner and print a failure line. */
    fail(message?: string): void;
}

type Renderer = {
    label: string;
    frame: number;
    stream: NodeJS.WriteStream;
    interval: NodeJS.Timeout | null;
    delayTimer: NodeJS.Timeout | null;
    visible: boolean;
};

let renderer: Renderer | null = null;
let holders = 0;
let signalsBound = false;

function canAnimate(force: boolean): boolean {
    if (force) return true;
    return Boolean(process.stdout.isTTY) && process.env.TERM !== "dumb";
}

function paint(current: Renderer): void {
    if (!current.visible) {
        current.visible = true;
        current.stream.write("\x1b[?25l"); // hide cursor
    }
    const frame = FRAMES[current.frame % FRAMES.length];
    current.stream.write(`\r\x1b[2K${chalk.cyan(frame)} ${chalk.dim(current.label)}`);
}

function startRendering(current: Renderer): void {
    paint(current);
    current.interval = setInterval(() => {
        current.frame += 1;
        paint(current);
    }, FRAME_INTERVAL_MS);
    current.interval.unref?.();
}

function stopRendering(): void {
    const current = renderer;
    if (!current) return;
    renderer = null;

    if (current.delayTimer) clearTimeout(current.delayTimer);
    if (current.interval) clearInterval(current.interval);

    if (current.visible) {
        current.stream.write("\r\x1b[2K");
        current.stream.write("\x1b[?25h"); // show cursor
        current.visible = false;
    }
}

function onSignal(): never {
    stopRendering();
    process.exit(130);
}

function bindSignals(): void {
    if (signalsBound) return;
    signalsBound = true;
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
}

function unbindSignals(): void {
    if (!signalsBound) return;
    signalsBound = false;
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
}

// If the process exits while the spinner is on screen, give the cursor back.
process.once("exit", () => {
    if (!renderer) return;
    if (renderer.delayTimer) clearTimeout(renderer.delayTimer);
    if (renderer.interval) clearInterval(renderer.interval);
    if (renderer.visible) process.stdout.write("\x1b[?25h");
});

function begin(label: string, options: LoaderOptions): () => void {
    if (!canAnimate(options.force ?? false)) return () => {};

    holders += 1;

    if (!renderer) {
        const current: Renderer = {
            label,
            frame: 0,
            stream: process.stdout,
            interval: null,
            delayTimer: null,
            visible: false,
        };
        renderer = current;
        bindSignals();

        const delay = Math.max(0, options.delay ?? DEFAULT_DELAY_MS);
        if (delay === 0) {
            startRendering(current);
        } else {
            current.delayTimer = setTimeout(() => {
                current.delayTimer = null;
                if (renderer === current) startRendering(current);
            }, delay);
            current.delayTimer.unref?.();
        }
    } else {
        renderer.label = label;
    }

    let released = false;
    return () => {
        if (released) return;
        released = true;

        holders -= 1;
        if (holders > 0) return;

        holders = 0;
        stopRendering();
        unbindSignals();
    };
}

/** Start a loader you control manually (use for progress updates). */
export function startLoader(label: string, options: LoaderOptions = {}): Loader {
    const release = begin(label, options);
    let finished = false;

    const stop = (): void => {
        if (finished) return;
        finished = true;
        release();
    };

    return {
        update(next: string): void {
            if (finished || !renderer) return;
            renderer.label = next;
        },
        stop,
        succeed(message?: string): void {
            stop();
            if (message) console.log(chalk.green(`✔ ${message}`));
        },
        fail(message?: string): void {
            stop();
            if (message) console.log(chalk.red(`✖ ${message}`));
        },
    };
}

/**
 * Run `task` behind a loader and clear it as soon as the task settles.
 * Works for both synchronous and asynchronous work.
 */
export async function withLoader<T>(
    label: string,
    task: () => T | Promise<T>,
    options: LoaderOptions = {},
): Promise<T> {
    const loader = startLoader(label, { ...options, delay: 0 });
    try {
        return await task();
    } finally {
        loader.stop();
    }
}
