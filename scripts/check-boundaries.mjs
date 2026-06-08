import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceExtensions = new Set([".astro", ".js", ".jsx", ".ts", ".tsx"]);
// Test files legitimately reference forbidden tokens (e.g. asserting r2_key is
// never leaked), so they are excluded from boundary scanning.
const testFilePattern = /(\.test\.|\.spec\.|[\\/]__tests__[\\/])/;

const rules = [
  {
    name: "site-no-cloudflare-workers",
    dir: "src/site",
    pattern: /cloudflare:workers|env\.DB|env\.IMAGES|env\.SESSION/,
    message: "src/site must not access Cloudflare bindings directly.",
  },
  {
    name: "admin-no-server-imports",
    dir: "src/admin",
    pattern: /@server\/|src\/server|cloudflare:workers|env\.DB|env\.IMAGES|env\.SESSION/,
    message: "src/admin must not import server runtime or Cloudflare bindings.",
  },
  {
    name: "modules-no-ui-boundary-imports",
    dir: "src/modules",
    pattern: /@admin\/|@site\/|src\/admin|src\/site|cloudflare:workers/,
    message: "src/modules must stay domain-only.",
  },
  {
    name: "modules-no-components",
    dir: "src/modules",
    pattern: /\.(astro|jsx|tsx)$/i,
    pathOnly: true,
    message: "src/modules must not contain UI component files.",
  },
  {
    name: "admin-no-persistent-r2-key",
    dir: "src/admin",
    pattern: /r2_key/,
    message: "Admin UI/helpers must not depend on persisted r2_key fields.",
  },
];

async function listFiles(dir) {
  const absoluteDir = path.join(root, dir);
  try {
    await stat(absoluteDir);
  } catch {
    return [];
  }

  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(relative);
      return [relative];
    }),
  );
  return files.flat();
}

const violations = [];

for (const rule of rules) {
  const files = await listFiles(rule.dir);
  for (const file of files) {
    const extension = path.extname(file);
    if (!sourceExtensions.has(extension)) continue;
    if (testFilePattern.test(file)) continue;

    if (rule.pathOnly) {
      if (rule.pattern.test(file)) {
        violations.push({ rule, file, lineNumber: 1, line: file });
      }
      continue;
    }

    const content = await readFile(path.join(root, file), "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      // A line may opt out with an inline `boundary-allow` comment when the
      // match is a justified false positive.
      if (rule.pattern.test(line) && !/boundary-allow/.test(line)) {
        violations.push({
          rule,
          file,
          lineNumber: index + 1,
          line: line.trim(),
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Boundary violations found:");
  for (const violation of violations) {
    console.error(
      `- [${violation.rule.name}] ${violation.file}:${violation.lineNumber} ${violation.line}`,
    );
    console.error(`  ${violation.rule.message}`);
  }
  process.exitCode = 1;
} else {
  console.log("Boundary check passed.");
}
