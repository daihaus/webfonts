/* global console, process */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rootDir = process.cwd();
const sourceRoot = path.resolve(
  rootDir,
  process.env.LXGW_BRIGHT_SOURCE ?? "../gh.lxgw.lxgwbright",
);
const splitterSourceRoot = path.resolve(
  rootDir,
  process.env.CN_FONT_SPLIT_SOURCE ?? "../gh.konghayao.cn-font-split",
);
const splitterBuildRoot = path.join(rootDir, ".cache", "cn-font-split-build");
const fontsRoot = path.join(rootDir, "fonts");

const families = [
  {
    slug: "lxgw-bright",
    family: "LXGW Bright",
    sourceDir: "LXGWBright",
    sourcePrefix: "LXGWBright",
  },
  {
    slug: "lxgw-bright-gb",
    family: "LXGW Bright GB",
    sourceDir: "LXGWBrightGB",
    sourcePrefix: "LXGWBrightGB",
  },
  {
    slug: "lxgw-bright-tc",
    family: "LXGW Bright TC",
    sourceDir: "LXGWBrightTC",
    sourcePrefix: "LXGWBrightTC",
  },
];

const styles = [
  { label: "300", source: "Light", weight: "300", style: "normal" },
  { label: "300-italic", source: "LightItalic", weight: "300", style: "italic" },
  { label: "400", source: "Regular", weight: "400", style: "normal" },
  { label: "400-italic", source: "Italic", weight: "400", style: "italic" },
  { label: "500", source: "Medium", weight: "500", style: "normal" },
  { label: "500-italic", source: "MediumItalic", weight: "500", style: "italic" },
];

async function commandOutput(command, args, options = {}) {
  const { stdout } = await execFileAsync(command, args, options);
  return stdout.trim();
}

async function gitOutput(repoPath, args) {
  if (!existsSync(path.join(repoPath, ".git"))) {
    return null;
  }

  try {
    return await commandOutput("git", ["-C", repoPath, ...args]);
  } catch {
    return null;
  }
}

async function harfbuzzRustflags() {
  const libs = await commandOutput("pkg-config", [
    "--libs",
    "harfbuzz-subset",
    "harfbuzz-vector",
  ]);
  return libs
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token.startsWith("-L")) {
        return `-L native=${token.slice(2)}`;
      }
      if (token.startsWith("-l")) {
        return `-l ${token.slice(2)}`;
      }
      return token;
    })
    .join(" ");
}

async function prepareSplitterBuildRoot() {
  await fs.rm(splitterBuildRoot, { force: true, recursive: true });
  await fs.mkdir(path.dirname(splitterBuildRoot), { recursive: true });
  await fs.cp(splitterSourceRoot, splitterBuildRoot, {
    recursive: true,
    filter(source) {
      const relative = path.relative(splitterSourceRoot, source);
      const ignored = [".git", "node_modules", "target"];
      return !ignored.some((entry) => relative === entry || relative.startsWith(`${entry}/`));
    },
  });

  await fs.writeFile(
    path.join(splitterBuildRoot, "src", "pre_subset", "gen_svg.rs"),
    [
      "use crate::runner::Context;",
      "",
      "pub fn gen_svg_from_ctx(_ctx: &mut Context) {}",
      "",
    ].join("\n"),
  );
}

function sourceFileFor(family, style) {
  return path.join(sourceRoot, family.sourceDir, `${family.sourcePrefix}-${style.source}.ttf`);
}

function normalizeCss(css, fileMap) {
  let normalized = css;
  for (const [from, to] of fileMap) {
    normalized = normalized.replaceAll(`url("./${from}")`, `url("./files/${to}")`);
  }

  return normalized
    .replaceAll(')format("woff2")', ') format("woff2")')
    .replaceAll("}@", "}\n@")
    .trimEnd()
    .concat("\n");
}

async function moveGeneratedFonts(tempOutDir, familyOutDir, family, style) {
  const filesDir = path.join(familyOutDir, "files");
  const entries = await fs.readdir(tempOutDir);
  const generatedFonts = entries.filter((entry) => entry.endsWith(".woff2"));
  const moved = [];
  const fileMap = new Map();

  for (const generatedFont of generatedFonts) {
    const from = path.join(tempOutDir, generatedFont);
    const toName = `${family.slug}-${style.weight}-${style.style}-${generatedFont}`;
    await fs.rename(from, path.join(filesDir, toName));
    fileMap.set(generatedFont, toName);
    moved.push(toName);
  }

  return {
    files: moved.sort(),
    fileMap,
  };
}

async function buildStyle(family, style, familyOutDir, rustflags) {
  const tempOutDir = path.join(familyOutDir, ".tmp", style.label);
  const input = sourceFileFor(family, style);

  if (!existsSync(input)) {
    throw new Error(`Missing source font: ${input}`);
  }

  await fs.rm(tempOutDir, { force: true, recursive: true });
  await fs.mkdir(tempOutDir, { recursive: true });

  await execFileAsync(
    "cargo",
    [
      "run",
      "--release",
      "--bin",
      "cn-font-split",
      "--",
      "--input",
      input,
      "--out-dir",
      tempOutDir,
      "--font-family",
      family.family,
      "--font-weight",
      style.weight,
      "--font-style",
      style.style,
      "--font-display",
      "swap",
      "--file-name",
      `${style.label}.css`,
      "--reporter",
      "true",
      "--rename-output-font",
      "[hash:10].[ext]",
      "--test-html",
      "false",
    ],
    {
      cwd: splitterBuildRoot,
      env: {
        ...process.env,
        RUSTFLAGS: [process.env.RUSTFLAGS, rustflags].filter(Boolean).join(" "),
      },
    },
  );

  const { fileMap, files: movedFonts } = await moveGeneratedFonts(
    tempOutDir,
    familyOutDir,
    family,
    style,
  );
  const generatedCssPath = path.join(tempOutDir, `${style.label}.css`);
  const css = normalizeCss(await fs.readFile(generatedCssPath, "utf8"), fileMap);

  await fs.writeFile(path.join(familyOutDir, `${style.label}.css`), css);
  await fs.rm(tempOutDir, { force: true, recursive: true });

  return {
    css: `${style.label}.css`,
    files: movedFonts.map((file) => `files/${file}`),
    input: path.relative(rootDir, input),
    style: style.style,
    weight: style.weight,
  };
}

async function buildFamily(family, provenance, rustflags) {
  const familyOutDir = path.join(fontsRoot, family.slug);
  await fs.rm(familyOutDir, { force: true, recursive: true });
  await fs.mkdir(path.join(familyOutDir, "files"), { recursive: true });

  const entries = [];
  for (const style of styles) {
    console.log(`Building ${family.family} ${style.label}`);
    entries.push(await buildStyle(family, style, familyOutDir, rustflags));
  }

  await fs.copyFile(path.join(sourceRoot, "OFL.txt"), path.join(familyOutDir, "OFL.txt"));
  await fs.rm(path.join(familyOutDir, ".tmp"), { force: true, recursive: true });

  const metadata = {
    family: family.family,
    slug: family.slug,
    license: "OFL-1.1",
    source: provenance.source,
    generator: provenance.generator,
    entries,
  };

  await fs.writeFile(
    path.join(familyOutDir, "metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  return {
    family: family.family,
    license: "OFL-1.1",
    slug: family.slug,
    styles: entries.map(({ css, style, weight }) => ({ css, style, weight })),
  };
}

async function main() {
  if (!existsSync(sourceRoot)) {
    throw new Error(`LXGW Bright source checkout not found: ${sourceRoot}`);
  }

  await fs.mkdir(fontsRoot, { recursive: true });
  const rustflags = await harfbuzzRustflags();

  const provenance = {
    source: {
      repository: "https://github.com/lxgw/LxgwBright",
      path: sourceRoot,
      commit: await gitOutput(sourceRoot, ["rev-parse", "HEAD"]),
      version: await gitOutput(sourceRoot, ["describe", "--tags", "--always", "--dirty"]),
    },
    generator: {
      crate: "cn-font-split",
      repository: "https://github.com/KonghaYao/cn-font-split",
      path: splitterSourceRoot,
      commit: await gitOutput(splitterSourceRoot, ["rev-parse", "HEAD"]),
      version: await gitOutput(splitterSourceRoot, [
        "describe",
        "--tags",
        "--always",
        "--dirty",
      ]),
      cargoVersion: await commandOutput("cargo", ["--version"]),
      buildPatch:
        "preview SVG generation disabled in .cache build copy for HarfBuzz 14 compatibility",
    },
  };

  await prepareSplitterBuildRoot();

  const manifest = {
    generatedAt: new Date().toISOString(),
    families: [],
  };

  for (const family of families) {
    manifest.families.push(await buildFamily(family, provenance, rustflags));
  }

  await fs.writeFile(
    path.join(fontsRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

await main();
