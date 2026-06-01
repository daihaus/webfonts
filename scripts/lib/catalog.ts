import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Family, Manifest } from "./manifest.ts";
import { dirName, packageName, packageVersion, stylesOf, weightsOf } from "./util.ts";

const START = "<!-- FONTS:START -->";
const END = "<!-- FONTS:END -->";

/** Copy the upstream license into the package dir and write a Fontsource-style `metadata.json`. */
export async function writeFamilyMeta(opts: {
  family: Family;
  familyDir: string;
  sourceRoot: string;
  manifest: Manifest;
}): Promise<void> {
  const { family, familyDir, sourceRoot, manifest } = opts;

  await copyFile(
    join(sourceRoot, family.upstream.licensePath),
    join(familyDir, family.license.file),
  );

  const metadata = {
    name: packageName(manifest, family),
    version: packageVersion(family),
    slug: family.slug,
    displayName: family.displayName,
    cssFamily: family.cssFamily,
    fontDisplay: family.fontDisplay,
    weights: weightsOf(family),
    styles: stylesOf(family),
    instances: family.instances.map((i) => ({
      weight: i.weight,
      style: i.style,
      dir: dirName(i),
      css: `${dirName(i)}/result.css`,
    })),
    license: {
      id: family.license.id,
      reservedFontName: family.license.reservedFontName,
      file: family.license.file,
    },
    upstream: {
      repo: family.upstream.repo,
      version: family.upstream.version,
      homepage: family.upstream.homepage,
    },
    generator: {
      tool: manifest.generator.tool,
      wrapper: manifest.generator.version,
      core: manifest.generator.core,
    },
  };

  await writeFile(
    join(familyDir, "metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
}

/** Regenerate the font catalog table inside README.md (between the FONTS markers). */
export async function updateReadmeCatalog(opts: {
  readmePath: string;
  manifest: Manifest;
}): Promise<void> {
  const { readmePath, manifest } = opts;

  const rows = manifest.families.map((f) => {
    const name = packageName(manifest, f);
    const version = packageVersion(f);
    const cdn = `https://cdn.jsdelivr.net/npm/${name}@${version}/index.css`;
    const weights = weightsOf(f).join(", ");
    const styles = stylesOf(f).join(", ");
    const upstream = `[${f.upstream.repo}@${f.upstream.version}](${f.upstream.homepage})`;
    return `| [\`${name}\`](https://www.npmjs.com/package/${name}) | \`${f.cssFamily}\` | ${weights} | ${styles} | ${f.license.id} | ${upstream} | [\`index.css\`](${cdn}) |`;
  });

  const table = [
    "| Package | `font-family` | Weights | Styles | License | Upstream | jsDelivr |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");

  const note =
    `\n\n_Served from npm via jsDelivr: \`https://cdn.jsdelivr.net/npm/${manifest.npm.scope}/<name>@<version>/...\` — ` +
    `subset with ${manifest.generator.tool} (wrapper ${manifest.generator.version}, core ${manifest.generator.core}). ` +
    `Pin an exact version._\n`;
  const block = `${START}\n${table}${note}${END}`;

  let readme = await readFile(readmePath, "utf8").catch(() => "");
  if (readme.includes(START) && readme.includes(END)) {
    readme = readme.replace(new RegExp(`${START}[\\s\\S]*${END}`), block);
  } else {
    readme += `${readme.endsWith("\n") || readme === "" ? "" : "\n"}\n## Available fonts\n\n${block}\n`;
  }
  await writeFile(readmePath, readme, "utf8");
}
