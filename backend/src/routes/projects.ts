import { Router } from "express";
import { listProjects } from "../catalog";

export const projectsRouter = Router();

projectsRouter.get("/", (_req, res) => {
  try {
    res.json(listProjects().map((p) => ({ id: p.id, name: p.name, business_goal: p.business_goal })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
