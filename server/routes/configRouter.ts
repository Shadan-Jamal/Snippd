import { Router, type Request, type Response } from "express";
import {
    CONFIG_FILE,
    configFileExists,
    getConfiguredEditorCommand,
} from "../../src/config/snippdConfig.ts";
import { renderConfigStatusHtml } from "../utils/templates.ts";

const configRouter = Router();

configRouter.get("/", (_req: Request, res: Response) => {
    const { command, key } = getConfiguredEditorCommand();
    const exists = configFileExists();
    const role =
        key === "SNIPPD_VISUAL"
            ? "GUI"
            : key === "SNIPPD_EDITOR"
                ? "TUI"
                : "fallback";

    res.type("html").send(
        renderConfigStatusHtml({
            configFile: CONFIG_FILE,
            command,
            key,
            role,
            exists,
        }),
    );
});

export default configRouter;
