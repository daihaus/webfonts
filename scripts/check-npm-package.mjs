/* global console, process */

import { spawnSync } from "node:child_process";

const maxPackageSize = 256 * 1024 * 1024;
const requiredFiles = [
  "fonts/manifest.json",
  "fonts/lxgw-bright/400.css",
  "fonts/lxgw-bright-gb/400.css",
  "fonts/lxgw-bright-tc/400.css",
];

const result = spawnSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

let pack;
try {
  [pack] = JSON.parse(result.stdout);
} catch (error) {
  throw new Error(`Unable to parse npm pack output: ${error.message}`, { cause: error });
}

if (!pack) {
  throw new Error("npm pack produced no package metadata");
}

if (pack.size > maxPackageSize) {
  throw new Error(`Package size ${pack.size} exceeds ${maxPackageSize} bytes`);
}

const paths = new Set(pack.files.map((file) => file.path));
for (const file of requiredFiles) {
  if (!paths.has(file)) {
    throw new Error(`Package is missing ${file}`);
  }
}

const woff2Count = pack.files.filter((file) => file.path.endsWith(".woff2")).length;
if (woff2Count === 0) {
  throw new Error("Package includes no WOFF2 files");
}

console.log(
  [
    `npm package verified: ${pack.filename}`,
    `size: ${pack.size} bytes`,
    `unpacked: ${pack.unpackedSize} bytes`,
    `files: ${pack.entryCount}`,
    `woff2: ${woff2Count}`,
  ].join("\n"),
);
