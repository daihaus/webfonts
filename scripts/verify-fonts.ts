import { open, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import config from "../fonts.config.ts";
import { parseManifest } from "./lib/manifest.ts";
import {
  dirName,
  packageName,
  packageVersion,
  repoRoot,
  stylesOf,
  weightsOf,
} from "./lib/util.ts";

const LFS_POINTER = "version https://git-lfs";
const WOFF2_MAGIC = 0x774f4632; // 'wOF2'
const URL_REF = /url\(["']?\.\/([^"')]+\.woff2)["']?\)/g;

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readHead(p: string, n: number): Promise<Buffer> {
  const fh = await open(p, "r");
  try {
    const buf = Buffer.alloc(n);
    await fh.read(buf, 0, n, 0);
    return buf;
  } finally {
    await fh.close();
  }
}

function chunkRefs(css: string): string[] {
  return [...css.matchAll(URL_REF)].map((m) => m[1]);
}

async function main(): Promise<void> {
  const manifest = parseManifest(config);
  const outRoot = join(repoRoot, manifest.outRoot);
  const errors: string[] = [];
  let chunks = 0;

  for (const family of manifest.families) {
    const familyDir = join(outRoot, family.slug);

    for (const required of [
      family.license.file,
      "metadata.json",
      "index.css",
      "package.json",
      "README.md",
    ]) {
      if (!(await fileExists(join(familyDir, required))))
        errors.push(`missing ${family.slug}/${required}`);
    }

    // package.json identity + npm files allowlist (woff2 must ship despite being gitignored).
    const pkgPath = join(familyDir, "package.json");
    if (await fileExists(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as {
        name?: string;
        version?: string;
        files?: string[];
      };
      if (pkg.name !== packageName(manifest, family))
        errors.push(`${family.slug}/package.json: wrong name ${String(pkg.name)}`);
      if (pkg.version !== packageVersion(family))
        errors.push(`${family.slug}/package.json: wrong version ${String(pkg.version)}`);
      if (!pkg.files?.some((g) => g.includes("woff2")))
        errors.push(`${family.slug}/package.json: files[] does not include woff2`);
    }

    // Every CSS entry point — atomic cuts + per-weight/per-style bundles + the full index — paired
    // with the exact set of cut sub-dirs (`<weight>-<style>`) it must inline. Each cut's chunks live
    // under `./<dir>/`, so the dirs seen in a file's url() refs reveal precisely which cuts it carries.
    const cssFiles: { file: string; cuts: string[] }[] = [
      ...family.instances.map((i) => ({ file: `${dirName(i)}.css`, cuts: [dirName(i)] })),
      ...weightsOf(family).map((w) => ({
        file: `weight-${String(w)}.css`,
        cuts: family.instances.filter((i) => i.weight === w).map((i) => dirName(i)),
      })),
      ...stylesOf(family).map((s) => ({
        file: `style-${s}.css`,
        cuts: family.instances.filter((i) => i.style === s).map((i) => dirName(i)),
      })),
      { file: "index.css", cuts: family.instances.map((i) => dirName(i)) },
    ];

    // Validate each referenced woff2 once (LFS pointer / wOF2 magic), no matter how many files cite it.
    const checked = new Set<string>();

    for (const { file, cuts } of cssFiles) {
      const cssPath = join(familyDir, file);
      if (!(await fileExists(cssPath))) {
        errors.push(`missing ${family.slug}/${file}`);
        continue;
      }
      const css = await readFile(cssPath, "utf8");
      const refs = chunkRefs(css);
      if (!refs.length) errors.push(`${family.slug}/${file}: references no woff2 chunks`);

      // Coverage: the cut sub-dirs this file actually inlines must equal the set it should carry.
      // A too-narrow/too-broad subset filter in writeFamilyStyles would otherwise ship a silently
      // wrong bundle (e.g. weight-400.css missing its italic cut) that still passes the ref checks.
      const seenCuts = new Set(refs.map((r) => r.split("/")[0]));
      const wantCuts = new Set(cuts);
      for (const c of wantCuts)
        if (!seenCuts.has(c)) errors.push(`${family.slug}/${file}: missing cut ${c}`);
      for (const c of seenCuts)
        if (!wantCuts.has(c)) errors.push(`${family.slug}/${file}: unexpected cut ${c}`);

      for (const ref of refs) {
        const chunkPath = join(familyDir, ref);
        if (!(await fileExists(chunkPath))) {
          errors.push(`${family.slug}/${file}: unresolved ./${ref}`);
          continue;
        }
        if (checked.has(ref)) continue;
        checked.add(ref);
        const head = await readHead(chunkPath, 24);
        if (head.toString("utf8").startsWith(LFS_POINTER)) {
          errors.push(`${family.slug}/${ref}: is a git-lfs pointer (jsDelivr cannot serve it)`);
        } else if (head.readUInt32BE(0) !== WOFF2_MAGIC) {
          errors.push(`${family.slug}/${ref}: not a valid woff2 file`);
        }
        chunks++;
      }
    }

    // Each atomic cut must carry exactly its weight/style @font-face descriptors.
    for (const instance of family.instances) {
      const file = `${dirName(instance)}.css`;
      const cssPath = join(familyDir, file);
      if (!(await fileExists(cssPath))) continue; // already reported as missing above
      const css = await readFile(cssPath, "utf8");
      if (!css.includes(`font-family:"${family.cssFamily}"`)) {
        errors.push(`${family.slug}/${file}: font-family "${family.cssFamily}" not found`);
      }
      if (!css.includes(`font-weight:${String(instance.weight)}`)) {
        errors.push(`${family.slug}/${file}: font-weight ${String(instance.weight)} not found`);
      }
      if (!css.includes(`font-style:${instance.style}`)) {
        errors.push(`${family.slug}/${file}: font-style ${instance.style} not found`);
      }
    }
  }

  if (errors.length) {
    console.error(`✗ verify failed — ${String(errors.length)} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `✓ verify passed: ${String(manifest.families.length)} families, ${String(chunks)} woff2 chunks — every url() resolves, no LFS pointers.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
