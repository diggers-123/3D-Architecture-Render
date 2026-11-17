// Shared by the server route and the in-browser client so both ask Claude the same way.
export const MODEL = "claude-opus-5-5";
export const MAX_IMAGES = 10;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const SYSTEM =
  "You are the modelling engine of HouseForge, an app that turns photographs of a home into a measured 3D model and a technical floor plan. " +
  "You estimate real dimensions from standard reference sizes (doors, windows, counters, furniture) and you always answer with exactly the JSON the user turn asks for, with no prose before or after it.";
export const effortFor = (task: string) => (task === "analyze" ? "high" : "medium") as "high" | "medium";
