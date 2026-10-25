import { Router, type Request, type Response } from "express";
import {
    CONFIG_FILE,
    configFileExists,
    getConfiguredEditorCommand,
    getCurrentEditorKey,
    initConfigFile,
    normalizeConfigKey,
    readConfigFile,
    setConfigKey,
} from "../../src/config/snippdConfig.ts";
import { renderConfigPanelHtml, renderConfigStatusHtml } from "../utils/configTemplateUtil.ts";

const configRouter = Router();

function editorRole(key: string | null): string {
    if (key === "SNIPPD_GUI") return "GUI";
    if (key === "SNIPPD_TUI") return "TUI";
    return "fallback";
}

function configView() {
    const { command, key } = getConfiguredEditorCommand();
    return {
        configFile: CONFIG_FILE,
        command,
        key,
        role: editorRole(key),
        currentEditor: getCurrentEditorKey(),
        exists: configFileExists(),
        values: readConfigFile(),
    };
}

configRouter.get("/", (_req: Request, res: Response) => {
    const view = configView();
    res.type("html").send(renderConfigStatusHtml(view));
});

configRouter.get("/show", (_req: Request, res: Response) => {
    res.type("html").send(renderConfigPanelHtml(configView()));
});

configRouter.get("/current", (_req: Request, res: Response) => {
    const values = readConfigFile();
    res.json({ ...values, CURRENT_EDITOR: getCurrentEditorKey() });
});

configRouter.post("/init", (_req: Request, res: Response) => {
    try {
        const created = initConfigFile();
        res.type("html").send(renderConfigPanelHtml({
            ...configView(),
            message: created ? "Created config.json" : "Config file already exists",
            messageKind: created ? "ok" : "warn",
        }));
    } catch (error) {
        console.error(error);
        res.type("html").send(renderConfigPanelHtml({
            ...configView(),
            message: `Could not create config.json: ${String(error)}`,
            messageKind: "error",
        }));
    }
});

configRouter.post("/set", (req: Request, res: Response) => {
    try {
        const configKey = normalizeConfigKey(String(req.body.key ?? ""));
        const value = String(req.body.value ?? "");

        if (!configKey) {
            return res.type("html").send(renderConfigPanelHtml({
                ...configView(),
                message: "Unknown key. Use CURRENT_EDITOR, SNIPPD_GUI, SNIPPD_TUI, OLLAMA_API_URL, or OLLAMA_MODEL.",
                messageKind: "error",
            }));
        }

        setConfigKey(configKey, value);
        return res.type("html").send(renderConfigPanelHtml({
            ...configView(),
            message: `Updated ${configKey}`,
            messageKind: "ok",
        }));
    } catch (error) {
        console.error(error);
        return res.type("html").send(renderConfigPanelHtml({
            ...configView(),
            message: `Could not update config: ${String(error)}`,
            messageKind: "error",
        }));
    }
});

export default configRouter;
