import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import config from "../fonts.config.ts";
import { writeFamilyStyles } from "./lib/aggregate.ts";
import { updateReadmeCatalog, writeFamilyMeta } from "./lib/catalog.ts";
import { ensureCoreBinary } from "./lib/core.ts";
import { parseManifest } from "./lib/manifest.ts";
import { writePackageManifest, writePackageReadme } from "./lib/package.ts";
import { resolveSourceRoot } from "./lib/source.ts";
import { splitInstance } from "./lib/split.ts";
import { dirName, repoRoot } from "./lib/util.ts";

interface Cli {
  families?: string[];
  clean: boolean;
  catalogOnly: boolean;
  sourceRoot?: string;
}

function parseCli(argv: string[]): Cli {
  const cli: Cli = { clean: false, catalogOnly: false };
  const families: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") continue; // npm/pnpm forward this script-args separator through verbatim
    if (arg === "--family") {
      const value = argv[++i];
      if (!value) throw new Error("--family requires a slug");
      families.push(value);
    } else if (arg === "--source-root") {
      const value = argv[++i];
      if (!value) throw new Error("--source-root requires a path");
      cli.sourceRoot = value;
    } else if (arg === "--clean") {
      cli.clean = true;
    } else if (arg === "--catalog-only") {
      cli.catalogOnly = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (families.length) cli.families = families;
  return cli;
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  const manifest = parseManifest(config);
  const outRoot = join(repoRoot, manifest.outRoot);
  const readmePath = join(repoRoot, "README.md");

  // --catalog-only regenerates just the root README table from the manifest — no source, no splits,
  // no per-family files. (Bump a package version etc. with a full `build:fonts`.)
  if (cli.catalogOnly) {
    await updateReadmeCatalog({ readmePath, manifest });
    console.log("✓ README catalog updated");
    return;
  }

  const families = manifest.families.filter(
    (f) => !cli.families || cli.families.includes(f.slug),
  );
  if (!families.length) throw new Error(`No families matched ${JSON.stringify(cli.families)}`);

  // Resolve the native core once and point the package at it before the first split.
  process.env.CN_FONT_SPLIT_BIN = await ensureCoreBinary(
    manifest.generator.core,
    manifest.generator.coreChecksums,
  );

  for (const family of families) {
    const familyDir = join(outRoot, family.slug);
    // --clean wipes the whole package dir first, so stale/renamed cuts and their content-hashed
    // woff2 don't linger and get re-published via the `files` allowlist.
    if (cli.clean) await rm(familyDir, { recursive: true, force: true });
    const sourceRoot = await resolveSourceRoot(family, cli.sourceRoot);

    for (const instance of family.instances) {
      const dir = dirName(instance);
      const outDir = join(familyDir, dir);
      await mkdir(outDir, { recursive: true });
      const started = Date.now();
      await splitInstance({ family, instance, sourceRoot, outDir });
      console.log(`  ✓ ${family.slug}/${dir} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    }

    await writeFamilyMeta({ family, familyDir, sourceRoot, manifest });
    await writeFamilyStyles({
      family,
      familyDir,
      generator: `${manifest.generator.tool}@${manifest.generator.version} (core ${manifest.generator.core})`,
    });
    await writePackageManifest({ family, familyDir, manifest });
    await writePackageReadme({ family, familyDir, manifest });
    console.log(`✓ ${family.displayName} → ${manifest.outRoot}/${family.slug}/`);
  }

  await updateReadmeCatalog({ readmePath, manifest });
  console.log("✓ README catalog updated");
}

main()
  .then(() => {
    // cn-font-split's native FFI can SIGABRT during process teardown even after a clean build, which
    // would make a successful run report failure (and break `release`'s && chain). Exit explicitly.
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
