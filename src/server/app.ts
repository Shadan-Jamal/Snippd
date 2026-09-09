import express, {type Express, type Request, type Response } from "express";

const app: Express = express();
const port = 8000;

app.get("/", (req: Request, res: Response) => {
    res.send("Hello World");
});

const startApp = async () => app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
});

export default startApp;