import { open, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import config from "../fonts.config.ts";
import { parseManifest } from "./lib/manifest.ts";
import { dirName, packageName, packageVersion, repoRoot } from "./lib/util.ts";

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

    // index.css references must resolve relative to the family dir.
    const indexPath = join(familyDir, "index.css");
    if (await fileExists(indexPath)) {
      for (const ref of chunkRefs(await readFile(indexPath, "utf8"))) {
        if (!(await fileExists(join(familyDir, ref))))
          errors.push(`${family.slug}/index.css: unresolved ./${ref}`);
      }
    }

    for (const instance of family.instances) {
      const dir = dirName(instance);
      const styleDir = join(familyDir, dir);
      const cssPath = join(styleDir, "result.css");
      if (!(await fileExists(cssPath))) {
        errors.push(`missing ${family.slug}/${dir}/result.css`);
        continue;
      }

      const css = await readFile(cssPath, "utf8");
      if (!css.includes(`font-family:"${family.cssFamily}"`)) {
        errors.push(`${family.slug}/${dir}: font-family "${family.cssFamily}" not found`);
      }
      if (!css.includes(`font-weight:${String(instance.weight)}`)) {
        errors.push(`${family.slug}/${dir}: font-weight ${String(instance.weight)} not found`);
      }
      if (!css.includes(`font-style:${instance.style}`)) {
        errors.push(`${family.slug}/${dir}: font-style ${instance.style} not found`);
      }

      const refs = chunkRefs(css);
      if (!refs.length)
        errors.push(`${family.slug}/${dir}: result.css references no woff2 chunks`);
      for (const ref of refs) {
        const chunkPath = join(styleDir, ref);
        if (!(await fileExists(chunkPath))) {
          errors.push(`${family.slug}/${dir}: missing chunk ${ref}`);
          continue;
        }
        const head = await readHead(chunkPath, 24);
        if (head.toString("utf8").startsWith(LFS_POINTER)) {
          errors.push(
            `${family.slug}/${dir}/${ref}: is a git-lfs pointer (jsDelivr cannot serve it)`,
          );
        } else if (head.readUInt32BE(0) !== WOFF2_MAGIC) {
          errors.push(`${family.slug}/${dir}/${ref}: not a valid woff2 file`);
        }
        chunks++;
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
