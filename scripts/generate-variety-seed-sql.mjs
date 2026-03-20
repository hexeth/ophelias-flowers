import path from "node:path";
import {
  defaultSeedOutputFile,
  rootDir,
  writeSeedSql,
} from "./lib/catalog-bootstrap.mjs";

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

const args = process.argv.slice(2);

const outputFile = getArgValue(args, "--output") ?? defaultSeedOutputFile;
const imageBaseUrl = getArgValue(args, "--image-base-url") ?? "/catalog-seed";
const imageKeyPrefix = getArgValue(args, "--image-key-prefix") ?? "";

const result = await writeSeedSql({
  outputFile,
  imageBaseUrl,
  imageKeyPrefix,
});

console.log(
  `Wrote ${result.varieties.length} seed statements to ${path.relative(rootDir, result.outputFile)}`,
);
