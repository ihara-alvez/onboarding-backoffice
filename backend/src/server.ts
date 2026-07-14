import express from "express";
import cors from "cors";
import { profilesRouter } from "./routes/profiles";
import { projectsRouter } from "./routes/projects";
import { onboardingsRouter } from "./routes/onboardings";

const app = express();
const PORT = Number(process.env.PORT ?? 8000);

app.use(cors());
app.use(express.json());
app.use("/api/profiles", profilesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/onboardings", onboardingsRouter);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`onboarding-backoffice backend listening on http://localhost:${PORT}`);
});
