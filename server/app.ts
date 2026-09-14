import express, {type Express, type Request, type Response } from "express";
import doctorRouter from "./routes/doctorRouter.ts";
import configRouter from "./routes/configRouter.ts";
import snippetsRouter from "./routes/snippetsRouter.ts";
import path from "path"

const app: Express = express();
const PORT = 8000;

app.use("/ui", express.static(path.join(import.meta.dirname, "templates/pageTemplates")));
app.use("/ui/assets", express.static(path.join(import.meta.dirname, "templates/assets")));
app.use(express.urlencoded({ extended: true }));
app.use("/api/snippets", snippetsRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/config", configRouter);

app.get("/", (req: Request, res: Response) => {
    res.redirect("/ui");
});

const startApp = async () => app.listen(PORT,() => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default startApp;