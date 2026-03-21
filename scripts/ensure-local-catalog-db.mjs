import { spawn } from "node:child_process";
import path from "node:path";
import { rootDir } from "./lib/catalog-bootstrap.mjs";

const localWranglerConfigPath = path.join(rootDir, "wrangler.local.toml");
const deletedAtMigrationName = "0002_add_deleted_at_to_varieties.sql";

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

function parseWranglerJson(stdout, description) {
  const trimmed = stdout.trim();

  if (!trimmed) {
    throw new Error(`Missing JSON output from ${description}.`);
  }

  return JSON.parse(trimmed);
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
      "--json",
    ]);

    const parsed = parseWranglerJson(stdout, "PRAGMA table_info(varieties)");
    const results = Array.isArray(parsed) ? parsed[0]?.results : [];

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .map((row) => (typeof row?.name === "string" ? row.name : null))
      .filter((name) => name !== null);
  } catch {
    return [];
  }
}

async function getAppliedMigrationNames() {
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
      "SELECT name FROM d1_migrations ORDER BY id;",
      "--json",
    ]);

    const parsed = parseWranglerJson(stdout, "SELECT name FROM d1_migrations");
    const results = Array.isArray(parsed) ? parsed[0]?.results : [];

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .map((row) => (typeof row?.name === "string" ? row.name : null))
      .filter((name) => name !== null);
  } catch {
    return [];
  }
}

async function markDeletedAtMigrationApplied() {
  await runCommand("npx", [
    "wrangler",
    "d1",
    "execute",
    "CATALOG_DB",
    "--local",
    "--config",
    localWranglerConfigPath,
    "--command",
    `INSERT INTO d1_migrations (name, applied_at) VALUES ('${deletedAtMigrationName}', datetime('now'))`,
  ]);
}

async function bootstrapLocalCatalog() {
  await runCommand("node", [
    "scripts/bootstrap-catalog.mjs",
    "--skip-images",
  ]);
}

const columns = await getLocalVarietiesColumns();
const appliedMigrationNames = await getAppliedMigrationNames();

if (columns.includes("deleted_at")) {
  if (!appliedMigrationNames.includes(deletedAtMigrationName)) {
    console.log(
      "Local catalog schema already has deleted_at; recording migration 0002 in local d1_migrations.",
    );
    await markDeletedAtMigrationApplied();
  }

  process.exit(0);
}

console.log("Local catalog schema is missing deleted_at; applying local catalog bootstrap.");
await bootstrapLocalCatalog();