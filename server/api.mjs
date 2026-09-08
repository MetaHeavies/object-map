import path from "node:path";
import {createApi as createSkillApi} from "../skills/object-map/scripts/api.mjs";
export function createApi(root = path.resolve(process.env.OBJECT_MAP_REPO || "examples/workspace")) { return createSkillApi(root); }
