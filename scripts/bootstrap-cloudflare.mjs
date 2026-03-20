import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rootDir } from "./lib/catalog-bootstrap.mjs";

const wranglerConfigPath = path.join(rootDir, "wrangler.toml");
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function parseJsonOutput(stdout, description) {
  const trimmed = stdout.trim();
  const arrayStart = trimmed.indexOf("[");
  const objectStart = trimmed.indexOf("{");
  let startIndex = -1;

  if (arrayStart !== -1 && objectStart !== -1) {
    startIndex = Math.min(arrayStart, objectStart);
  } else {
    startIndex = Math.max(arrayStart, objectStart);
  }

  if (startIndex === -1) {
    throw new Error(`Unable to parse JSON from ${description}.`);
  }

  return JSON.parse(trimmed.slice(startIndex));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceArrayBlock(text, blockName, nextBlockName, replacement) {
  const pattern = new RegExp(
    `\\[\\[${escapeRegExp(blockName)}\\]\\][\\s\\S]*?(?=\\n\\[\\[${escapeRegExp(nextBlockName)}\\]\\]|\\n\\[[^[]|$)`,
  );

  if (pattern.test(text)) {
    return text.replace(pattern, replacement.trimEnd());
  }

  const varsPattern = /\n\[vars\]/;
  if (varsPattern.test(text)) {
    return text.replace(varsPattern, `\n${replacement.trimEnd()}\n\n[vars]`);
  }

  return `${text.trimEnd()}\n\n${replacement.trimEnd()}\n`;
}

function setPlainVar(text, key, value) {
  const varsSectionPattern = /\[vars\][\s\S]*?(?=\n\[[^[]|$)/;

  if (!varsSectionPattern.test(text)) {
    return `${text.trimEnd()}\n\n[vars]\n${key} = "${value}"\n`;
  }

  return text.replace(varsSectionPattern, (section) => {
    const keyPattern = new RegExp(
      `(^${escapeRegExp(key)}\\s*=\\s*").*("$)`,
      "m",
    );

    if (keyPattern.test(section)) {
      return section.replace(keyPattern, `$1${value}$2`);
    }

    return `${section.trimEnd()}\n${key} = "${value}"`;
  });
}

function renderKvBlock(resource) {
  return `[[kv_namespaces]]\nbinding = "SESSION"\nid = "${resource.id}"\npreview_id = "${resource.previewId}"`;
}

function renderD1Block(resource) {
  return `[[d1_databases]]\nbinding = "CATALOG_DB"\ndatabase_name = "${resource.name}"\ndatabase_id = "${resource.id}"`;
}

function renderR2Block(resource) {
  return `[[r2_buckets]]\nbinding = "VARIETY_IMAGES"\nbucket_name = "${resource.name}"`;
}

function parseWranglerConfig(text) {
  const projectNameMatch = text.match(/^name\s*=\s*"([^"]+)"/m);
  const kvIdMatch = text.match(
    /\[\[kv_namespaces\]\][\s\S]*?\nid\s*=\s*"([^"]+)"/,
  );
  const kvPreviewIdMatch = text.match(
    /\[\[kv_namespaces\]\][\s\S]*?\npreview_id\s*=\s*"([^"]+)"/,
  );
  const databaseNameMatch = text.match(
    /\[\[d1_databases\]\][\s\S]*?\ndatabase_name\s*=\s*"([^"]+)"/,
  );
  const databaseIdMatch = text.match(
    /\[\[d1_databases\]\][\s\S]*?\ndatabase_id\s*=\s*"([^"]+)"/,
  );
  const bucketNameMatch = text.match(
    /\[\[r2_buckets\]\][\s\S]*?\nbucket_name\s*=\s*"([^"]+)"/,
  );
  const imageBaseUrlMatch = text.match(
    /^CATALOG_IMAGE_PUBLIC_BASE_URL\s*=\s*"([^"]+)"/m,
  );

  return {
    projectName: projectNameMatch?.[1] ?? "ophelias-flowers",
    kvId: kvIdMatch?.[1] ?? null,
    kvPreviewId: kvPreviewIdMatch?.[1] ?? null,
    databaseName: databaseNameMatch?.[1] ?? null,
    databaseId: databaseIdMatch?.[1] ?? null,
    bucketName: bucketNameMatch?.[1] ?? null,
    imageBaseUrl: imageBaseUrlMatch?.[1] ?? null,
  };
}

function buildDesiredConfig({ currentConfig, args }) {
  const projectName = currentConfig.projectName;
  const databaseName =
    getArgValue(args, "--database-name") ??
    currentConfig.databaseName ??
    `${projectName}-catalog`;
  const bucketName =
    getArgValue(args, "--bucket-name") ??
    currentConfig.bucketName ??
    `${projectName}-variety-images`;
  const kvNamespaceName =
    getArgValue(args, "--kv-name") ?? `${projectName}-session`;
  const publicDomain = getArgValue(args, "--public-domain");
  const explicitImageBaseUrl = getArgValue(args, "--image-base-url");
  const imageBaseUrl = explicitImageBaseUrl
    ? trimTrailingSlash(explicitImageBaseUrl)
    : publicDomain
      ? `${trimTrailingSlash(publicDomain)}/catalog-images`
      : currentConfig.imageBaseUrl;

  return {
    projectName,
    databaseName,
    bucketName,
    kvNamespaceName,
    kvPreviewNamespaceName: `${kvNamespaceName}_preview`,
    imageBaseUrl,
    d1Location: getArgValue(args, "--d1-location"),
    d1Jurisdiction: getArgValue(args, "--d1-jurisdiction"),
    r2Location: getArgValue(args, "--r2-location"),
    r2Jurisdiction: getArgValue(args, "--r2-jurisdiction"),
    r2StorageClass: getArgValue(args, "--r2-storage-class"),
  };
}

function buildNextWranglerConfig(text, resources, imageBaseUrl) {
  let next = replaceArrayBlock(
    text,
    "kv_namespaces",
    "d1_databases",
    renderKvBlock(resources.kv),
  );
  next = replaceArrayBlock(
    next,
    "d1_databases",
    "r2_buckets",
    renderD1Block(resources.d1),
  );
  next = replaceArrayBlock(
    next,
    "r2_buckets",
    "vars",
    renderR2Block(resources.r2),
  );

  if (imageBaseUrl) {
    next = setPlainVar(next, "CATALOG_IMAGE_PUBLIC_BASE_URL", imageBaseUrl);
  }

  return `${next.trimEnd()}\n`;
}

function buildCatalogBootstrapArgs(args, desiredConfig) {
  if (hasFlag(args, "--skip-content")) {
    return null;
  }

  const bootstrapArgs = ["scripts/bootstrap-catalog.mjs", "--remote"];

  if (hasFlag(args, "--skip-images")) {
    bootstrapArgs.push("--skip-images");
  }

  if (hasFlag(args, "--skip-r2-upload")) {
    bootstrapArgs.push("--skip-r2-upload");
  }

  if (hasFlag(args, "--skip-migration")) {
    bootstrapArgs.push("--skip-migration");
  }

  if (hasFlag(args, "--skip-seed")) {
    bootstrapArgs.push("--skip-seed");
  }

  if (desiredConfig.imageBaseUrl) {
    bootstrapArgs.push("--image-base-url", desiredConfig.imageBaseUrl);
  }

  return bootstrapArgs;
}

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: [options.input ? "pipe" : "ignore", "pipe", "pipe"],
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

      const error = new Error(
        `${formatCommand(command, args)} failed with exit code ${code ?? "unknown"}.`,
      );

      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });

    if (options.input) {
      child.stdin.end(options.input);
    }
  });
}

function runWrangler(args, options) {
  return runCommand("npx", ["wrangler", ...args], options);
}

function outputContainsNotFound(output) {
  return /not found|does not exist|unknown bucket|404/i.test(output);
}

async function listD1Databases() {
  const { stdout } = await runWrangler(["d1", "list", "--json"]);
  return parseJsonOutput(stdout, "wrangler d1 list");
}

async function listKvNamespaces() {
  const { stdout } = await runWrangler(["kv", "namespace", "list"]);
  return parseJsonOutput(stdout, "wrangler kv namespace list");
}

async function getR2BucketInfo(name, jurisdiction) {
  const args = ["r2", "bucket", "info", name, "--json"];

  if (jurisdiction) {
    args.push("--jurisdiction", jurisdiction);
  }

  try {
    const { stdout } = await runWrangler(args);
    return parseJsonOutput(stdout, `wrangler r2 bucket info ${name}`);
  } catch (error) {
    const combinedOutput = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;

    if (outputContainsNotFound(combinedOutput)) {
      return null;
    }

    throw error;
  }
}

async function ensureD1Resource(
  currentConfig,
  desiredConfig,
  createdResources,
  dryRun,
) {
  if (isUuid(currentConfig.databaseId) && currentConfig.databaseName) {
    return {
      id: currentConfig.databaseId,
      name: currentConfig.databaseName,
      existed: true,
    };
  }

  const databases = await listD1Databases();
  const existing = databases.find(
    (database) => database.name === desiredConfig.databaseName,
  );

  if (existing) {
    return {
      id: existing.uuid,
      name: existing.name,
      existed: true,
    };
  }

  if (dryRun) {
    return {
      id: currentConfig.databaseId,
      name: desiredConfig.databaseName,
      existed: false,
      planned: true,
    };
  }

  const createArgs = ["d1", "create", desiredConfig.databaseName];

  if (desiredConfig.d1Jurisdiction) {
    createArgs.push("--jurisdiction", desiredConfig.d1Jurisdiction);
  } else if (desiredConfig.d1Location) {
    createArgs.push("--location", desiredConfig.d1Location);
  }

  await runWrangler(createArgs);

  const nextDatabases = await listD1Databases();
  const created = nextDatabases.find(
    (database) => database.name === desiredConfig.databaseName,
  );

  if (!created) {
    throw new Error(
      `Unable to resolve the newly created D1 database ${desiredConfig.databaseName}.`,
    );
  }

  createdResources.push({ kind: "d1", name: created.name });

  return {
    id: created.uuid,
    name: created.name,
    existed: false,
  };
}

async function ensureKvResource(
  currentConfig,
  desiredConfig,
  createdResources,
  dryRun,
) {
  if (isUuid(currentConfig.kvId) && isUuid(currentConfig.kvPreviewId)) {
    return {
      id: currentConfig.kvId,
      previewId: currentConfig.kvPreviewId,
      existed: true,
    };
  }

  let namespaces = await listKvNamespaces();
  let mainNamespace = namespaces.find(
    (namespace) => namespace.title === desiredConfig.kvNamespaceName,
  );
  let previewNamespace = namespaces.find(
    (namespace) => namespace.title === desiredConfig.kvPreviewNamespaceName,
  );

  if (mainNamespace && previewNamespace) {
    return {
      id: mainNamespace.id,
      previewId: previewNamespace.id,
      existed: true,
    };
  }

  if (dryRun) {
    return {
      id: currentConfig.kvId,
      previewId: currentConfig.kvPreviewId,
      existed: false,
      planned: true,
    };
  }

  if (!mainNamespace) {
    await runWrangler([
      "kv",
      "namespace",
      "create",
      desiredConfig.kvNamespaceName,
    ]);
    namespaces = await listKvNamespaces();
    mainNamespace = namespaces.find(
      (namespace) => namespace.title === desiredConfig.kvNamespaceName,
    );

    if (!mainNamespace) {
      throw new Error(
        `Unable to resolve the newly created KV namespace ${desiredConfig.kvNamespaceName}.`,
      );
    }

    createdResources.push({ kind: "kv", id: mainNamespace.id });
  }

  if (!previewNamespace) {
    await runWrangler([
      "kv",
      "namespace",
      "create",
      desiredConfig.kvNamespaceName,
      "--preview",
    ]);
    namespaces = await listKvNamespaces();
    previewNamespace = namespaces.find(
      (namespace) => namespace.title === desiredConfig.kvPreviewNamespaceName,
    );

    if (!previewNamespace) {
      throw new Error(
        `Unable to resolve the newly created preview KV namespace ${desiredConfig.kvPreviewNamespaceName}.`,
      );
    }

    createdResources.push({ kind: "kv", id: previewNamespace.id });
  }

  return {
    id: mainNamespace.id,
    previewId: previewNamespace.id,
    existed: false,
  };
}

async function ensureR2Resource(desiredConfig, createdResources, dryRun) {
  const existing = await getR2BucketInfo(
    desiredConfig.bucketName,
    desiredConfig.r2Jurisdiction,
  );

  if (existing) {
    return {
      name: existing.name,
      existed: true,
    };
  }

  if (dryRun) {
    return {
      name: desiredConfig.bucketName,
      existed: false,
      planned: true,
    };
  }

  const createArgs = ["r2", "bucket", "create", desiredConfig.bucketName];

  if (desiredConfig.r2Jurisdiction) {
    createArgs.push("--jurisdiction", desiredConfig.r2Jurisdiction);
  } else if (desiredConfig.r2Location) {
    createArgs.push("--location", desiredConfig.r2Location);
  }

  if (desiredConfig.r2StorageClass) {
    createArgs.push("--storage-class", desiredConfig.r2StorageClass);
  }

  await runWrangler(createArgs);

  const created = await getR2BucketInfo(
    desiredConfig.bucketName,
    desiredConfig.r2Jurisdiction,
  );

  if (!created) {
    throw new Error(
      `Unable to resolve the newly created R2 bucket ${desiredConfig.bucketName}.`,
    );
  }

  createdResources.push({
    kind: "r2",
    name: created.name,
    jurisdiction: desiredConfig.r2Jurisdiction,
  });

  return {
    name: created.name,
    existed: false,
  };
}

async function rollbackCreatedResources(createdResources) {
  for (const resource of [...createdResources].reverse()) {
    try {
      if (resource.kind === "r2") {
        const args = ["r2", "bucket", "delete", resource.name];

        if (resource.jurisdiction) {
          args.push("--jurisdiction", resource.jurisdiction);
        }

        await runWrangler(args);
        continue;
      }

      if (resource.kind === "d1") {
        await runWrangler([
          "d1",
          "delete",
          resource.name,
          "--skip-confirmation",
        ]);
        continue;
      }

      if (resource.kind === "kv") {
        await runWrangler([
          "kv",
          "namespace",
          "delete",
          "--namespace-id",
          resource.id,
          "--skip-confirmation",
        ]);
      }
    } catch (error) {
      console.warn(`Rollback failed for ${resource.kind}: ${error.message}`);
    }
  }
}

function printUsage() {
  console.log(`Usage: node scripts/bootstrap-cloudflare.mjs [options]

Creates or reuses the Cloudflare resources required by this project, updates wrangler.toml,
and then runs the existing remote catalog bootstrap unless --skip-content is provided.

Options:
  --dry-run                Show planned actions without mutating Cloudflare or wrangler.toml
  --skip-content           Provision resources only; do not run the remote catalog bootstrap
  --skip-images            Pass through to scripts/bootstrap-catalog.mjs
  --skip-r2-upload         Pass through to scripts/bootstrap-catalog.mjs
  --skip-migration         Pass through to scripts/bootstrap-catalog.mjs
  --skip-seed              Pass through to scripts/bootstrap-catalog.mjs
  --database-name <name>   Override the D1 database name
  --bucket-name <name>     Override the R2 bucket name
  --kv-name <name>         Override the KV namespace title prefix
  --public-domain <url>    Set CATALOG_IMAGE_PUBLIC_BASE_URL to <url>/catalog-images
  --image-base-url <url>   Set CATALOG_IMAGE_PUBLIC_BASE_URL directly
  --d1-location <code>     Pass a location hint to wrangler d1 create
  --d1-jurisdiction <id>   Pass a jurisdiction to wrangler d1 create
  --r2-location <code>     Pass a location hint to wrangler r2 bucket create
  --r2-jurisdiction <id>   Pass a jurisdiction to wrangler r2 bucket create
  --r2-storage-class <id>  Pass a default storage class to wrangler r2 bucket create
  --help                   Show this message
`);
}

const args = process.argv.slice(2);

if (hasFlag(args, "--help")) {
  printUsage();
  process.exit(0);
}

const dryRun = hasFlag(args, "--dry-run");
const originalWranglerConfig = await readFile(wranglerConfigPath, "utf8");
const currentConfig = parseWranglerConfig(originalWranglerConfig);
const desiredConfig = buildDesiredConfig({ currentConfig, args });
const createdResources = [];
const catalogBootstrapArgs = buildCatalogBootstrapArgs(args, desiredConfig);

if (
  !dryRun &&
  !desiredConfig.imageBaseUrl &&
  !hasFlag(args, "--skip-r2-upload")
) {
  throw new Error(
    "CATALOG_IMAGE_PUBLIC_BASE_URL is not configured. Provide --public-domain or --image-base-url before seeding remote image URLs.",
  );
}

console.log(`Preparing Cloudflare bootstrap for ${desiredConfig.projectName}.`);

try {
  const d1 = await ensureD1Resource(
    currentConfig,
    desiredConfig,
    createdResources,
    dryRun,
  );
  const kv = await ensureKvResource(
    currentConfig,
    desiredConfig,
    createdResources,
    dryRun,
  );
  const r2 = await ensureR2Resource(desiredConfig, createdResources, dryRun);

  const nextWranglerConfig = buildNextWranglerConfig(
    originalWranglerConfig,
    { d1, kv, r2 },
    desiredConfig.imageBaseUrl,
  );

  console.log(
    `D1: ${d1.name}${d1.existed ? " (existing)" : dryRun ? " (planned)" : " (created)"}`,
  );
  console.log(
    `KV: ${desiredConfig.kvNamespaceName}${kv.existed ? " (existing)" : dryRun ? " (planned)" : " (created)"}`,
  );
  console.log(
    `R2: ${r2.name}${r2.existed ? " (existing)" : dryRun ? " (planned)" : " (created)"}`,
  );

  if (dryRun) {
    console.log("Dry run complete. No remote resources or files were changed.");
    process.exit(0);
  }

  if (nextWranglerConfig !== originalWranglerConfig) {
    await writeFile(wranglerConfigPath, nextWranglerConfig, "utf8");
    console.log("Updated wrangler.toml with resolved Cloudflare resource IDs.");
  }

  if (catalogBootstrapArgs) {
    console.log(
      "Running the remote catalog bootstrap against the resolved resources.",
    );
    await runCommand("node", catalogBootstrapArgs);
  }

  console.log("Cloudflare bootstrap complete.");
} catch (error) {
  if (!dryRun) {
    await writeFile(wranglerConfigPath, originalWranglerConfig, "utf8");
    await rollbackCreatedResources(createdResources);
  }

  console.error(error.message);
  process.exit(1);
}
