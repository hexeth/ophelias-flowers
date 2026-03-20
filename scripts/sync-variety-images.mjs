import path from "node:path";
import { rootDir, syncLegacyImagesToPublic } from "./lib/catalog-bootstrap.mjs";

const result = await syncLegacyImagesToPublic();

console.log(
  `Synced ${result.fileCount} legacy images to ${path.relative(rootDir, result.targetDir)}`,
);
