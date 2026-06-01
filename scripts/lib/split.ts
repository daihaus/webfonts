import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { verifySourceFile } from "./integrity.ts";
import type { Family, Instance } from "./manifest.ts";

interface FontSplitOptions {
  input: Uint8Array;
  outDir: string;
  css?: {
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    fontDisplay?: string;
  };
  renameOutputFont?: string;
  testHtml?: boolean;
  reporter?: boolean;
  silent?: boolean;
}
type FontSplitFn = (opts: FontSplitOptions) => Promise<void>;

let fontSplitFn: FontSplitFn | undefined;

/**
 * Load the `fontSplit` function. The package's bare entry is broken under Node ESM (its CJS build
 * references `import.meta`), so import the ESM build directly. Lazy so that `CN_FONT_SPLIT_BIN` can
 * be set before the native binary is resolved at import time.
 */
async function loadFontSplit(): Promise<FontSplitFn> {
  if (!fontSplitFn) {
    const mod = (await import("cn-font-split/dist/auto.mjs")) as unknown as {
      fontSplit: FontSplitFn;
    };
    fontSplitFn = mod.fontSplit;
  }
  return fontSplitFn;
}

/** Subset one font instance into `outDir` as a `result.css` plus content-hashed `.woff2` chunks. */
export async function splitInstance(opts: {
  family: Family;
  instance: Instance;
  sourceRoot: string;
  outDir: string;
}): Promise<void> {
  const { family, instance, sourceRoot, outDir } = opts;
  const buf = await readFile(join(sourceRoot, instance.file));
  const input = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  verifySourceFile(instance.file, input, family.upstream.sourceChecksums);

  const fontSplit = await loadFontSplit();
  await fontSplit({
    input,
    outDir,
    css: {
      fontFamily: family.cssFamily,
      fontWeight: String(instance.weight),
      fontStyle: instance.style,
      fontDisplay: family.fontDisplay,
    },
    renameOutputFont: "[hash:8].woff2",
    testHtml: false,
    reporter: false,
    silent: true,
  });

  // cn-font-split always drops a protobuf schema file we don't ship.
  await rm(join(outDir, "index.proto"), { force: true });

  // Normalize the generated CSS to LF so it commits cleanly under `* text=auto`.
  const cssPath = join(outDir, "result.css");
  const css = await readFile(cssPath, "utf8");
  if (css.includes("\r\n")) await writeFile(cssPath, css.replaceAll("\r\n", "\n"), "utf8");
}
