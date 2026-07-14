import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { Profile, Project } from "./types";

// READ-ONLY: this module never writes anywhere under DAYONE_REPO_PATH.
export const DAYONE_REPO_PATH = process.env.DAYONE_REPO_PATH
  ? path.resolve(process.env.DAYONE_REPO_PATH)
  : path.resolve(__dirname, "..", "..", "..", "dayone");

export const PROFILES_DIR = path.join(DAYONE_REPO_PATH, "profiles");
export const PROJECTS_DIR = path.join(DAYONE_REPO_PATH, "projects");

function listYamlIds(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort();
}

function readYaml<T>(dir: string, id: string): T {
  const file = path.join(dir, `${id}.yaml`);
  if (!fs.existsSync(file)) {
    throw new Error(`'${id}' not found in ${dir}. Available: ${listYamlIds(dir).join(", ")}`);
  }
  return yaml.load(fs.readFileSync(file, "utf-8")) as T;
}

export const listProfiles = (): Profile[] => listYamlIds(PROFILES_DIR).map((id) => readYaml<Profile>(PROFILES_DIR, id));
export const listProjects = (): Project[] => listYamlIds(PROJECTS_DIR).map((id) => readYaml<Project>(PROJECTS_DIR, id));
export const getProfile = (id: string): Profile => readYaml<Profile>(PROFILES_DIR, id);
export const getProject = (id: string): Project => readYaml<Project>(PROJECTS_DIR, id);
