import { spawn } from "node:child_process";
import path from "node:path";
import {
  createWranglerConfigWithoutD1,
  defaultSeedOutputFile,
  legacyImagesDir,
  listCatalogMigrationFiles,
  listLegacyImageFiles,
  readWranglerCatalogConfig,
  rootDir,
  syncLegacyImagesToPublic,
  writeSeedSql,
} from "./lib/catalog-bootstrap.mjs";

const localWranglerConfigPath = path.join(rootDir, "wrangler.local.toml");

function hasFlag(args, flag) {
  return args.includes(flag);
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

function isValidPublicBaseUrl(value) {
  return (
    typeof value === "string" && value.length > 0 && !value.endsWith(".invalid")
  );
}

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function getD1Target({ remote, explicitDatabase, wranglerConfig }) {
  if (explicitDatabase) {
    return explicitDatabase;
  }

  if (!remote) {
    return "CATALOG_DB";
  }

  if (isUuid(wranglerConfig.databaseId)) {
    return "CATALOG_DB";
  }

  if (wranglerConfig.databaseName) {
    return wranglerConfig.databaseName;
  }

  throw new Error(
    "Remote bootstrap requires either a real D1 database_name in wrangler.toml or an explicit --database value.",
  );
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}.`,
        ),
      );
    });

    child.on("error", reject);
  });
}

async function runD1Execute(target, file, modeArgs, configOverride) {
  const args = [
    "wrangler",
    "d1",
    "execute",
    target,
    "--file",
    file,
    ...modeArgs,
    "--yes",
  ];

  if (configOverride) {
    args.push("--config", configOverride);
  }

  await runCommand("npx", args);
}

const args = process.argv.slice(2);
const remote = hasFlag(args, "--remote");
const local = !remote;
const dryRun = hasFlag(args, "--dry-run");
const skipImages = hasFlag(args, "--skip-images");
const skipR2Upload = hasFlag(args, "--skip-r2-upload");
const skipMigration = hasFlag(args, "--skip-migration");
const skipSeed = hasFlag(args, "--skip-seed");
const persistTo = getArgValue(args, "--persist-to");
const explicitImageBaseUrl = getArgValue(args, "--image-base-url");
const explicitImageKeyPrefix = getArgValue(args, "--image-key-prefix");
const explicitDatabase = getArgValue(args, "--database");

const wranglerConfig = await readWranglerCatalogConfig();
const d1Target = getD1Target({
  remote,
  explicitDatabase,
  wranglerConfig,
});
const needsIsolatedRemoteD1Config =
  remote && !isUuid(wranglerConfig.databaseId);
const shouldUploadToR2 = remote && !skipR2Upload;
const imageBaseUrl = shouldUploadToR2
  ? (explicitImageBaseUrl ?? wranglerConfig.imageBaseUrl)
  : "/catalog-seed";
const imageKeyPrefix = shouldUploadToR2
  ? (explicitImageKeyPrefix ?? "varieties/legacy")
  : "";

if (shouldUploadToR2 && !isValidPublicBaseUrl(imageBaseUrl)) {
  throw new Error(
    "A valid --image-base-url is required for remote bootstrap so seeded rows point at your R2-backed public image URL.",
  );
}

if (shouldUploadToR2 && !wranglerConfig.bucketName) {
  throw new Error("Unable to determine the R2 bucket_name from wrangler.toml.");
}

console.log(
  `Bootstrapping legacy catalog in ${remote ? "remote" : "local"} mode.`,
);

if (remote && d1Target !== "CATALOG_DB") {
  console.log(
    `Using remote D1 target ${d1Target} because wrangler.toml does not contain a valid database_id for the CATALOG_DB binding.`,
  );
}

if (needsIsolatedRemoteD1Config) {
  console.log(
    "Remote D1 commands will run with a temporary Wrangler config that omits the invalid [[d1_databases]] binding block.",
  );
}

if (!skipImages) {
  const imageSyncResult = await syncLegacyImagesToPublic();
  console.log(
    `Synced ${imageSyncResult.fileCount} legacy images to ${path.relative(rootDir, imageSyncResult.targetDir)}.`,
  );
}

const seedResult = await writeSeedSql({
  outputFile: defaultSeedOutputFile,
  imageBaseUrl,
  imageKeyPrefix,
});

console.log(
  `Prepared ${seedResult.varieties.length} seeded varieties in ${path.relative(rootDir, seedResult.outputFile)}.`,
);

const d1ModeArgs = remote ? ["--remote"] : ["--local"];
if (persistTo && local) {
  d1ModeArgs.push("--persist-to", persistTo);
}

const d1ConfigOverride = local
  ? {
      configPath: localWranglerConfigPath,
      cleanup: async () => {},
    }
  : needsIsolatedRemoteD1Config
    ? await createWranglerConfigWithoutD1()
    : null;

if (dryRun) {
  await d1ConfigOverride?.cleanup();
  console.log("Dry run complete. No D1 or R2 mutations were executed.");
  process.exit(0);
}

try {
  if (!skipMigration) {
    const migrationFiles = await listCatalogMigrationFiles();

    for (const migrationFile of migrationFiles) {
      await runD1Execute(
        d1Target,
        migrationFile,
        d1ModeArgs,
        d1ConfigOverride?.configPath,
      );
    }
  }

  if (!skipSeed) {
    await runD1Execute(
      d1Target,
      seedResult.outputFile,
      d1ModeArgs,
      d1ConfigOverride?.configPath,
    );
  }

  if (shouldUploadToR2) {
    const fileNames = await listLegacyImageFiles();

    for (const fileName of fileNames) {
      const objectKey = `${imageKeyPrefix}/${fileName}`;
      await runCommand("npx", [
        "wrangler",
        "r2",
        "object",
        "put",
        `${wranglerConfig.bucketName}/${objectKey}`,
        "--remote",
        "--file",
        path.join(legacyImagesDir, fileName),
      ]);
    }

    console.log(
      `Uploaded ${fileNames.length} legacy images to R2 bucket ${wranglerConfig.bucketName}.`,
    );
  }

  console.log("Legacy catalog bootstrap complete.");
} finally {
  await d1ConfigOverride?.cleanup();
}
