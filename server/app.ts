import express, { type Express, type Request, type Response } from "express";
import doctorRouter from "./routes/doctorRouter.ts";
import configRouter from "./routes/configRouter.ts";
import snippetsRouter from "./routes/snippetsRouter.ts";
import backupRouter from "./routes/backupRouter.ts";
import containerRouter from "./routes/containerRouter.ts";
import tagsRouter from "./routes/tagsRouter.ts";
import aiRouter from "./routes/aiRouter.ts";
import path from "path"

const app: Express = express();
const PORT = 8000;

app.use("/ui", express.static(path.join(import.meta.dirname, "server/templates/pageTemplates")));
app.use("/ui/assets", express.static(path.join(import.meta.dirname, "server/templates/assets")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/snippets", snippetsRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/config", configRouter);
app.use("/api/backup", backupRouter);
app.use("/api/containers", containerRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/ai", aiRouter);

app.get("/", (_req: Request, res: Response) => {
    res.redirect("/ui");
});

const startApp = async () => app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});

export default startApp;