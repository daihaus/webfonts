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
    // Default import (".") is the full bundle; "./*" keeps every CSS entry point importable and every
    // url()→woff2 reference resolvable even under strict `exports` enforcement.
    exports: {
      ".": "./index.css",
      "./*": "./*",
    },
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
  const w = String(weights[1] ?? weights[0]); // sample weight
  const s = styles[0]; // sample style
  const cut = `${w}-${s}`; // sample atomic cut
  // npm pack flattens scoped names: @daihaus/lxgw-bright → daihaus-lxgw-bright-<version>.tgz
  const tarball = `${manifest.npm.scope.slice(1)}-${family.slug}-${version}.tgz`;

  const readme = `# ${name}

${description(family)}

- **font-family:** \`${family.cssFamily}\`
- **weights:** ${weights.join(", ")} · **styles:** ${styles.join(", ")}
- **license:** ${family.license.id} — generated from [${family.upstream.repo}@${family.upstream.version}](${family.upstream.homepage}) with ${manifest.generator.tool}

## CSS entry points

Every file lazy-loads only the glyph chunks a page actually uses (per \`unicode-range\`). Import the
narrowest one that covers the weights/styles you use — \`.woff2\` bytes are shared, so mixing files
never double-downloads a glyph.

| File | Contains |
| --- | --- |
| \`index.css\` | all weights × all styles |
| \`weight-<weight>.css\` | one weight, all styles — e.g. \`weight-${w}.css\` |
| \`style-<style>.css\` | one style, all weights — e.g. \`style-${s}.css\` |
| \`<weight>-<style>.css\` | exactly one cut — e.g. \`${cut}.css\` |

## Use via jsDelivr (no install)

\`\`\`html
<link rel="stylesheet" href="${cdn}/index.css" />
<style>
  body {
    font-family: "${family.cssFamily}", serif;
  }
</style>
\`\`\`

Narrower is smaller:

\`\`\`html
<link rel="stylesheet" href="${cdn}/weight-${w}.css" />
<link rel="stylesheet" href="${cdn}/${cut}.css" />
\`\`\`

## Use via npm (bundlers)

\`\`\`sh
npm install ${name}
\`\`\`

\`\`\`js
import "${name}";                // full bundle (index.css)
import "${name}/weight-${w}.css"; // one weight, all styles
import "${name}/style-${s}.css";   // one style, all weights
import "${name}/${cut}.css";      // exactly one cut
\`\`\`

Pin an exact version; the CSS already contains the \`@font-face\` rules.

## Install locally (without publishing)

Build the tarball (\`npm pack\` in this folder, or \`pnpm pack:fonts\` from the monorepo root), then:

\`\`\`sh
npm install ./${tarball}
\`\`\`

Or point a dependency straight at the built package folder:

\`\`\`jsonc
// package.json
{ "dependencies": { "${name}": "file:../path/to/packages/${family.slug}" } }
\`\`\`
`;
  await writeFile(join(familyDir, "README.md"), readme, "utf8");
}
