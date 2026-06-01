import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import config from "../fonts.config.ts";
import { writeFamilyIndex } from "./lib/aggregate.ts";
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
    if (arg === "--family") {
      const value = argv[++i];
      if (!value) throw new Error("--family requires a slug");
      families.push(value);
    } else if (arg === "--source-root") {
      cli.sourceRoot = argv[++i];
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

  const families = manifest.families.filter(
    (f) => !cli.families || cli.families.includes(f.slug),
  );
  if (!families.length) throw new Error(`No families matched ${JSON.stringify(cli.families)}`);

  if (!cli.catalogOnly) {
    // Resolve the native core once and point the package at it before the first split.
    process.env.CN_FONT_SPLIT_BIN = await ensureCoreBinary(manifest.generator.core);
  }

  for (const family of families) {
    const familyDir = join(outRoot, family.slug);
    const sourceRoot = await resolveSourceRoot(family, cli.sourceRoot);

    if (!cli.catalogOnly) {
      for (const instance of family.instances) {
        const dir = dirName(instance);
        const outDir = join(familyDir, dir);
        if (cli.clean) await rm(outDir, { recursive: true, force: true });
        await mkdir(outDir, { recursive: true });
        const started = Date.now();
        await splitInstance({ family, instance, sourceRoot, outDir });
        console.log(
          `  ✓ ${family.slug}/${dir} (${((Date.now() - started) / 1000).toFixed(1)}s)`,
        );
      }
    }

    await writeFamilyMeta({ family, familyDir, sourceRoot, manifest });
    await writeFamilyIndex({
      family,
      familyDir,
      generator: `${manifest.generator.tool}@${manifest.generator.version} (core ${manifest.generator.core})`,
    });
    await writePackageManifest({ family, familyDir, manifest });
    await writePackageReadme({ family, familyDir, manifest });
    console.log(`✓ ${family.displayName} → ${manifest.outRoot}/${family.slug}/`);
  }

  await updateReadmeCatalog({ readmePath: join(repoRoot, "README.md"), manifest });
  console.log("✓ README catalog updated");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
