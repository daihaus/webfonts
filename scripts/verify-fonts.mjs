/* global console, process */

import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const fontsRoot = path.join(rootDir, "fonts");
const expectedFamilies = ["lxgw-bright", "lxgw-bright-gb", "lxgw-bright-tc"];
const expectedStyles = [
  ["300.css", "300", "normal"],
  ["300-italic.css", "300", "italic"],
  ["400.css", "400", "normal"],
  ["400-italic.css", "400", "italic"],
  ["500.css", "500", "normal"],
  ["500-italic.css", "500", "italic"],
];

async function assertFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing file: ${path.relative(rootDir, filePath)}`);
  }
}

async function verifyCss(familyDir, cssFile, weight, style) {
  const cssPath = path.join(familyDir, cssFile);
  const css = await fs.readFile(cssPath, "utf8");

  const expectations = [
    [`font-weight: ${weight}`, new RegExp(`font-weight:\\s*${weight}`)],
    [`font-style: ${style}`, new RegExp(`font-style:\\s*${style}`)],
    ["font-display: swap", /font-display:\s*swap/],
    ["unicode-range", /unicode-range:\s*/],
    ['url("./files/', /url\("\.\/files\//],
  ];

  for (const [label, pattern] of expectations) {
    if (!pattern.test(css)) {
      throw new Error(`${path.relative(rootDir, cssPath)} does not include ${label}`);
    }
  }

  const refs = [...css.matchAll(/url\("\.\/files\/([^"]+)"\)/g)].map(([, file]) => file);

  if (refs.length === 0) {
    throw new Error(`${path.relative(rootDir, cssPath)} references no WOFF2 files`);
  }

  for (const ref of refs) {
    await assertFile(path.join(familyDir, "files", ref));
  }
}

async function main() {
  const manifestPath = path.join(fontsRoot, "manifest.json");
  await assertFile(manifestPath);

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.families.length !== expectedFamilies.length) {
    throw new Error("Unexpected family count in fonts/manifest.json");
  }

  for (const family of expectedFamilies) {
    const familyDir = path.join(fontsRoot, family);
    await assertFile(path.join(familyDir, "OFL.txt"));
    await assertFile(path.join(familyDir, "metadata.json"));

    for (const [cssFile, weight, style] of expectedStyles) {
      await verifyCss(familyDir, cssFile, weight, style);
    }
  }

  console.log("Font assets verified.");
}

await main();
