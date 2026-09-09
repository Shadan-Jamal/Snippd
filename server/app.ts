import express, {type Express, type Request, type Response } from "express";
import baseRoute from "./routes/baseRoute.ts";
import path from "path"

const app: Express = express();
const PORT = 8000;

app.use("/ui",express.static(path.join(import.meta.dirname, "templates")));
app.use(express.json());
app.use("/api", baseRoute);

app.get("/", (req: Request, res: Response) => {
    res.redirect("/ui");
});

const startApp = async () => app.listen(PORT,() => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default startApp;