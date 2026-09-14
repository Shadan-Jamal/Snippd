import { Router, type Request, type Response } from "express";

const doctorRouter = Router();

doctorRouter.post("/doctor", (req: Request, res: Response) => {
    console.log("Request", req.body)
    res.json({
        message: "Hello World"
    });
});

export default doctorRouter;