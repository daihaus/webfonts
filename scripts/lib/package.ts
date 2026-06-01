import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Family, Manifest } from "./manifest.ts";
import { packageName, packageVersion, stylesOf, weightsOf } from "./util.ts";

const BASE_KEYWORDS = [
  "font",
  "webfont",
  "woff2",
  "css",
  "cjk",
  "chinese",
  "subset",
  "fontsource",
];

function description(family: Family): string {
  return (
    family.description ??
    `${family.displayName} — self-hosted OFL webfont (unicode-range woff2). font-family: "${family.cssFamily}".`
  );
}

/** Write `packages/<slug>/package.json` describing the publishable npm package. */
export async function writePackageManifest(opts: {
  family: Family;
  familyDir: string;
  manifest: Manifest;
}): Promise<void> {
  const { family, familyDir, manifest } = opts;
  const pkg = {
    name: packageName(manifest, family),
    version: packageVersion(family),
    description: description(family),
    license: family.license.id,
    homepage: family.upstream.homepage,
    keywords: [...new Set([...BASE_KEYWORDS, family.slug, ...family.keywords])],
    repository: {
      type: "git",
      url: manifest.npm.repository,
      directory: `${manifest.outRoot}/${family.slug}`,
    },
    publishConfig: { access: "public" },
    // CSS has side effects (it registers @font-face); keep bundlers from tree-shaking it away.
    sideEffects: ["**/*.css"],
    // Allowlist the served assets so they ship even though woff2 is gitignored.
    files: ["**/*.css", "**/*.woff2", "metadata.json", family.license.file],
  };
  await writeFile(join(familyDir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

/** Write `packages/<slug>/README.md` with npm + jsDelivr usage. */
export async function writePackageReadme(opts: {
  family: Family;
  familyDir: string;
  manifest: Manifest;
}): Promise<void> {
  const { family, familyDir, manifest } = opts;
  const name = packageName(manifest, family);
  const version = packageVersion(family);
  const cdn = `https://cdn.jsdelivr.net/npm/${name}@${version}`;
  const weights = weightsOf(family);
  const styles = stylesOf(family);
  const sample = `${String(weights[1] ?? weights[0])}-${styles[0]}`;

  const readme = `# ${name}

${description(family)}

- **font-family:** \`${family.cssFamily}\`
- **weights:** ${weights.join(", ")} · **styles:** ${styles.join(", ")}
- **license:** ${family.license.id} — generated from [${family.upstream.repo}@${family.upstream.version}](${family.upstream.homepage}) with ${manifest.generator.tool}

## Use via jsDelivr (no install)

Whole family, one tag-pinned link (every weight/style, lazy-loaded per \`unicode-range\`):

\`\`\`html
<link rel="stylesheet" href="${cdn}/index.css" />
<style>
  body {
    font-family: "${family.cssFamily}", serif;
  }
</style>
\`\`\`

A single weight/style is smaller still:

\`\`\`html
<link rel="stylesheet" href="${cdn}/${sample}/result.css" />
\`\`\`

## Use via npm (bundlers)

\`\`\`sh
npm install ${name}
\`\`\`

\`\`\`js
import "${name}/index.css"; // or "${name}/${sample}/result.css"
\`\`\`

Pin an exact version; the CSS already contains the \`@font-face\` rules.
`;
  await writeFile(join(familyDir, "README.md"), readme, "utf8");
}
