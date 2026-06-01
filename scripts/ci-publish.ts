import { appendFile } from "node:fs/promises";

import config from "../fonts.config.ts";
import { parseManifest } from "./lib/manifest.ts";
import { packageName, packageVersion } from "./lib/util.ts";

/**
 * Decide what each manifest package needs:
 * - package missing from the registry  → `new`    (first publish; needs an npm token)
 * - package exists, version not yet up  → `update` (publish via OIDC trusted publishing)
 * - version already published           → `skip`
 *
 * Writes `new` / `update` / `build` / `hasWork` to `$GITHUB_OUTPUT` for the workflow to act on.
 */

/** Published versions of a package, or null if the package does not exist yet. */
async function publishedVersions(name: string): Promise<Set<string> | null> {
  const res = await fetch(`https://registry.npmjs.org/${name.replaceAll("/", "%2F")}`, {
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`registry query failed (HTTP ${String(res.status)}) for ${name}`);
  const body = (await res.json()) as { versions?: Record<string, unknown> };
  return new Set(Object.keys(body.versions ?? {}));
}

async function main(): Promise<void> {
  const manifest = parseManifest(config);
  const fresh: string[] = [];
  const update: string[] = [];
  const skip: string[] = [];

  for (const family of manifest.families) {
    const name = packageName(manifest, family);
    const version = packageVersion(family);
    const versions = await publishedVersions(name);
    if (versions === null) {
      fresh.push(family.slug);
      console.log(`NEW     ${name}@${version} — package does not exist (token publish)`);
    } else if (versions.has(version)) {
      skip.push(family.slug);
      console.log(`SKIP    ${name}@${version} — already published`);
    } else {
      update.push(family.slug);
      console.log(
        `UPDATE  ${name}@${version} — new version of existing package (OIDC publish)`,
      );
    }
  }

  const build = [...fresh, ...update];
  console.log(
    `\nplan: ${String(fresh.length)} new, ${String(update.length)} update, ${String(skip.length)} skip`,
  );

  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile) {
    await appendFile(
      outFile,
      `new=${fresh.join(" ")}\n` +
        `update=${update.join(" ")}\n` +
        `build=${build.join(" ")}\n` +
        `hasWork=${build.length > 0 ? "true" : "false"}\n`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
