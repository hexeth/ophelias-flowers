import { spawn } from "node:child_process";
import path from "node:path";
import { rootDir } from "./lib/catalog-bootstrap.mjs";

const localWranglerConfigPath = path.join(rootDir, "wrangler.local.toml");

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}.\n${stderr}`,
        ),
      );
    });
  });
}

async function getLocalVarietiesColumns() {
  try {
    const { stdout } = await runCommand("npx", [
      "wrangler",
      "d1",
      "execute",
      "CATALOG_DB",
      "--local",
      "--config",
      localWranglerConfigPath,
      "--command",
      "PRAGMA table_info(varieties);",
    ]);

    return Array.from(stdout.matchAll(/│\s*\d+\s*│\s*([^│]+?)\s*│/g), (match) =>
      match[1].trim(),
    );
  } catch {
    return [];
  }
}

async function bootstrapLocalCatalog() {
  await runCommand("node", [
    "scripts/bootstrap-catalog.mjs",
    "--skip-images",
  ]);
}

const columns = await getLocalVarietiesColumns();

if (columns.includes("deleted_at")) {
  process.exit(0);
}

console.log("Local catalog schema is missing deleted_at; applying local catalog bootstrap.");
await bootstrapLocalCatalog();