import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import config from "../fonts.config.ts";
import { parseManifest } from "./lib/manifest.ts";
import { packageName, packageVersion, repoRoot } from "./lib/util.ts";

/**
 * Pack each manifest package into a local tarball under `artifacts/` (gitignored) so developers can
 * install it without publishing to npm. Run after `pnpm build:fonts` (the built css/woff2 must exist).
 *
 * Install the result with `npm install ./artifacts/<tarball>`, or reference the package folder
 * directly via a `file:` dependency.
 */
async function main(): Promise<void> {
  const manifest = parseManifest(config);
  const outDir = join(repoRoot, "artifacts");
  await mkdir(outDir, { recursive: true });

  const tarballs: string[] = [];
  for (const family of manifest.families) {
    const pkgDir = join(repoRoot, manifest.outRoot, family.slug);
    // `npm pack` (no package arg) packs the cwd's package.json honoring its `files` allowlist.
    const res = spawnSync("npm", ["pack", "--silent", "--pack-destination", outDir], {
      cwd: pkgDir,
      encoding: "utf8",
    });
    if (res.status !== 0) {
      console.error(res.stderr || res.stdout);
      throw new Error(`npm pack failed for ${family.slug} (exit ${String(res.status)})`);
    }
    // npm pack flattens scoped names: @daihaus/lxgw-bright → daihaus-lxgw-bright-<version>.tgz
    const tarball = `${manifest.npm.scope.slice(1)}-${family.slug}-${packageVersion(family)}.tgz`;
    tarballs.push(tarball);
    console.log(`  ✓ ${packageName(manifest, family)} → artifacts/${tarball}`);
  }

  console.log(`\n✓ packed ${String(tarballs.length)} package(s). Install locally with:`);
  for (const t of tarballs) console.log(`    npm install ${join("artifacts", t)}`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
