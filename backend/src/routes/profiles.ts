import { Router } from "express";
import { listProfiles } from "../catalog";

export const profilesRouter = Router();

profilesRouter.get("/", (_req, res) => {
  try {
    res.json(listProfiles().map((p) => ({ id: p.id, name: p.name, summary: p.summary })));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
