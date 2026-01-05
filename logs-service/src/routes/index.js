import express from "express";
import logsRouter from "./routes/logs.routes.js";

const app = express();
app.use(express.json());


app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/logs", logsRouter);

export default app;
